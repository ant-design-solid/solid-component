import Motion from "@solid-component/motion";
import {
  Polymorphic,
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  composeHandlers,
  getShadowRoot,
  mergeRefs,
  mergeStyle,
} from "@solid-component/utils";
import { createElementSize } from "@solid-primitive/element-geometry";
import {
  makeEventListener,
  onClickOutside,
} from "@solid-primitive/event-listener";
import {
  DEV,
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
  untrack,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Portal } from "solid-js/web";
import {
  FloatingMotionConfig,
  useFloatingContext,
  useFloatingHostContext,
} from "./FloatingContext";
import useEscKeyDown from "./hooks/useEscKeyDown";
import { collectScroller, getOffsetStyle, getWin, warning } from "./utils";

export interface FloatingPopupOwnProps {
  zIndex?: number;
  motion?: FloatingMotionConfig;
  portal?: boolean | Omit<ComponentProps<typeof Portal>, "children">;
  onResize?: (size: FloatingPopupSize, node: HTMLElement) => void;
}

const POPUP_COMMON_PROPS = [
  "ref",
  "onMouseLeave",
  "onMouseEnter",
  "style",
] as const;

interface FloatingPopupCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "onMouseEnter" | "onMouseLeave" | "ref" | "style" | "class"
> {}

export interface FloatingPopupProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends FloatingPopupOwnProps, FloatingPopupCommonProps<ElementOf<T>> {}

export interface FloatingPopupSize {
  width: number;
  height: number;
}

export function FloatingPopupView(props: FloatingPopupProps) {
  const context = useFloatingContext();
  const host = useFloatingHostContext();
  const {
    open,
    setOpen,
    state,
    update,
    rootOptions,
    triggerRef,
    popupRef,
    setPopupRef,
    hasAction,
    contains,
  } = context;

  const [local, rest] = splitProps(props, [
    "motion",
    "portal",
    "zIndex",
    "onResize",
    ...POPUP_COMMON_PROPS,
  ]);

  const reposition = () => {
    untrack(() => {
      if (!inMotion()) {
        update();
      }
    });
  };
  const prepareUpdate = () => {
    const id = motioningContextId();
    return Promise.resolve().then(() => {
      if (!id || (host && !host.isActive(id))) return;
      update();
    });
  };

  const close = (delay?: number) => setOpen(false, delay);
  const [motioningContextId, setMotioningContextId] = createSignal<string>();
  const inMotion = () => !!motioningContextId();

  createEffect((prevOpen: boolean | undefined) => {
    const nextOpen = open();

    if (prevOpen === undefined ? nextOpen : nextOpen !== prevOpen) {
      setMotioningContextId(untrack(() => context.id));
    }

    return nextOpen;
  }, undefined);

  const { size: triggerSize } = createElementSize(
    createMemo(() => (rootOptions().stretch ? triggerRef() : null)),
    { controls: false, box: "border-box" },
  );
  const { size: popupSize } = createElementSize(popupRef, {
    controls: false,
    box: "border-box",
  });

  const interceptors = {
    onAppearPrepare: async (...args) => {
      await prepareUpdate();

      return local.motion?.onAppearPrepare?.(...args);
    },
    onEnterPrepare: async (...args) => {
      await prepareUpdate();

      return local.motion?.onEnterPrepare?.(...args);
    },
    onVisibleChangeEnd: (visible) => {
      const id = motioningContextId();

      setMotioningContextId(undefined);

      if (context.id === id) {
        void update();
        rootOptions().onOpenChangeEnd?.(visible);
      }

      local.motion?.onVisibleChangeEnd?.(visible);
    },
  } satisfies FloatingMotionConfig;
  const motion = createMemo(() => mergeProps(local.motion, interceptors));

  const portal = () => (local.portal === true ? {} : local.portal);

  const style = createMemo<JSX.CSSProperties>(() => {
    const positionState = state();
    const stretch = rootOptions().stretch;

    const offsetStyle = getOffsetStyle(open(), state());

    const positionStyle: JSX.CSSProperties = {
      position: "fixed",
      ...offsetStyle,
      "pointer-events": open() ? undefined : "none",
      "z-index": local.zIndex,
    };

    const surfaceStyle: JSX.CSSProperties = {
      "--arrow-x": `${positionState.arrow.x || 0}px`,
      "--arrow-y": `${positionState.arrow.y || 0}px`,
      "box-sizing": "border-box",
    };

    if (stretch) {
      const { width: triggerWidth, height: triggerHeight } = triggerSize();
      const width = triggerWidth / positionState.scaleX;
      const height = triggerHeight / positionState.scaleY;

      if (stretch.includes("height") && height) {
        surfaceStyle.height = `${height}px`;
      } else if (stretch.includes("minHeight") && height) {
        surfaceStyle["min-height"] = `${height}px`;
      }

      if (stretch.includes("width") && width) {
        surfaceStyle.width = `${width}px`;
      } else if (stretch.includes("minWidth") && width) {
        surfaceStyle["min-width"] = `${width}px`;
      }
    }

    return mergeStyle(
      {
        ...positionStyle,
        ...surfaceStyle,
      },
      local.style,
    );
  });

  const closeOnClickOutside = createMemo(() => {
    const override = rootOptions().closeOnClickOutside;
    return (
      override ??
      (hasAction("hide", "click") || hasAction("hide", "contextmenu"))
    );
  });

  onClickOutside(
    popupRef,
    () => {
      if (open() && closeOnClickOutside()) {
        close();
      }
    },
    {
      ignore: [triggerRef],
    },
  );

  const onContextMenuClose = (event: MouseEvent) => {
    const target = event.composedPath?.()[0] ?? event.target;

    if (!open() || !target || contains(target)) {
      return;
    }

    close();
  };

  createEffect(() => {
    if (!closeOnClickOutside()) {
      return;
    }

    const triggerEle = triggerRef();
    const popupEle = popupRef();

    const win = popupEle && getWin(popupEle);

    if (!win) {
      return;
    }

    const triggerRoot = getShadowRoot(triggerEle);
    const popupRoot = getShadowRoot(popupEle);
    const listenerRoots: (Window | ShadowRoot)[] = [win];

    if (triggerRoot) {
      listenerRoots.push(triggerRoot);
    }
    if (popupRoot && popupRoot !== triggerRoot) {
      listenerRoots.push(popupRoot);
    }

    if (DEV && triggerEle && triggerRoot !== popupRoot) {
      warning("trigger element and popup element should in same shadow root.");
    }

    onCleanup(
      makeEventListener(
        listenerRoots,
        "contextmenu",
        onContextMenuClose as EventListener,
        { capture: true } as const,
      ),
    );
  });

  useEscKeyDown(open, (e) => {
    if (e.inStackTop) {
      close();
    }
  });

  const scrollerList = createMemo(() => {
    const triggerEle = triggerRef();
    const popupEle = popupRef();
    const win = popupEle && getWin(popupEle);
    if (!triggerEle || !win) return;
    const triggerScrollList = collectScroller(triggerEle);
    const popupScrollList = collectScroller(popupEle);

    return [...new Set([win, ...triggerScrollList, ...popupScrollList])];
  });

  const onScroll = () => {
    void reposition();
    if (open() && rootOptions().alignPoint && hasAction("hide", "click")) {
      close();
    }
  };

  const PassiveOptions = { passive: true } as const;
  createEffect(() => {
    const list = scrollerList();

    if (list) {
      const cleanups = [
        makeEventListener(list, "scroll", onScroll, PassiveOptions),
        makeEventListener(list[0], "resize", onScroll, PassiveOptions),
      ];
      onCleanup(() => {
        cleanups.forEach((cleanup) => {
          cleanup();
        });
      });
    }

    void reposition();
  });

  createEffect(() => {
    const node = untrack(popupRef);

    if (!open() || !node) return;

    local.onResize?.(popupSize(), node);

    void reposition();
  });

  const onMouseLeave: JSX.HTMLAttributes<HTMLElement>["onMouseLeave"] = (
    event,
  ) => {
    if (inMotion()) return;
    const { relatedTarget } = event;
    if (
      hasAction("hide", "hover") ||
      !relatedTarget ||
      !contains(relatedTarget as Node)
    ) {
      close(rootOptions().delay.hoverClose);
    }
  };

  const onMouseEnter: JSX.HTMLAttributes<HTMLElement>["onMouseEnter"] = (
    event,
  ) => {
    if (
      hasAction("show", "hover") &&
      open() &&
      popupRef()?.contains(event?.target)
    ) {
      setOpen(true, rootOptions().delay.hoverOpen);
    }
  };
  const view = () => (
    <Motion
      visible={open()}
      forceRender={rootOptions().forceRender}
      removeOnLeave={!rootOptions().forceRender}
      {...motion()}
    >
      <Polymorphic<FloatingPopupCommonProps<HTMLElement>>
        as="div"
        ref={mergeRefs(local.ref, setPopupRef)}
        style={style()}
        aria-hidden={!open()}
        onMouseLeave={composeHandlers(local.onMouseLeave, onMouseLeave)}
        onMouseEnter={composeHandlers(local.onMouseEnter, onMouseEnter)}
        {...rest}
      />
    </Motion>
  );

  return (
    <Show when={portal()} fallback={view()}>
      {(portal) => <Portal {...portal()}>{view()}</Portal>}
    </Show>
  );
}

export default function FloatingPopup<T extends ValidComponent>(
  props: PolymorphicProps<T, FloatingPopupProps<T>>,
) {
  const context = useFloatingContext();
  const { id, open, host } = context;
  const merged = props as FloatingPopupProps;

  return (
    <>
      <Show when={host()} fallback={<FloatingPopupView {...merged} />}>
        {(host) => {
          const hostContext = host();
          const entry = {
            id,
            context,
            props: merged,
          };
          onCleanup(hostContext.register(entry));

          createEffect((wasOpen) => {
            const nextOpen = open();

            if (nextOpen && !wasOpen) {
              untrack(() => hostContext.activate(id));
            } else if (!nextOpen && wasOpen) {
              untrack(() => hostContext.deactivate(id));
            }

            return nextOpen;
          }, false);

          return null;
        }}
      </Show>
    </>
  );
}
