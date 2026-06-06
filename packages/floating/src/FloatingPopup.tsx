import Motion from "@solid-component/motion";
import type { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import {
  composeHandlers,
  getShadowRoot,
  mergeRefs,
  mergeStyle,
  warning,
} from "@solid-component/utils";
import {
  createElementSize,
  makeEventListener,
  onClickOutside,
} from "@solid-primitive/web";
import {
  createEffect,
  createMemo,
  DEV,
  splitProps,
  untrack,
  ValidComponent,
} from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { FloatingMotionConfig } from "./FloatingContext";
import { useFloatingContext } from "./FloatingContext";
import useEscKeyDown from "./hooks/useEscKeyDown";
import { collectScroller, getWin } from "./utils";

interface FloatingPopupCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref" | "style" | "onMouseEnter" | "onMouseLeave"
> {}

export interface FloatingPopupProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> extends FloatingPopupCommonProps<ElementOf<T>> {
  zIndex?: number;
  motion?: FloatingMotionConfig;
}

export default function FloatingPopup<T extends ValidComponent>(
  props: PolymorphicProps<T, FloatingPopupProps<T>>,
) {
  const {
    open,
    setOpen,
    hasAction,
    rootOptions,
    triggerRef,
    popupRef,
    setPopupRef,
    position,
    reposition,
    contains,
  } = useFloatingContext();

  const [local, others] = splitProps(props as FloatingPopupProps, [
    "ref",
    "zIndex",
    "style",
    "motion",
    "onMouseLeave",
    "onMouseEnter",
  ]);
  const { size: triggerSize } = createElementSize(
    createMemo(() => (rootOptions().stretch ? triggerRef() : null)),
    { controls: false },
  );
  const { size: popupSize } = createElementSize(popupRef, {
    controls: false,
  });

  const motion = createMemo(() => {
    const motion = local.motion ?? {};
    return {
      ...motion,
      onAppearPrepare: async (...args) => {
        await reposition();
        return motion.onAppearPrepare?.(...args);
      },
      onEnterPrepare: async (...args) => {
        await reposition();
        return motion.onEnterPrepare?.(...args);
      },
      onVisibleChanged: (visible) => {
        motion.onVisibleChanged?.(visible);
        if (visible) {
          requestAnimationFrame(() => {
            void reposition();
          });
        }
      },
    } satisfies FloatingMotionConfig;
  });

  const popupStyle = createMemo<JSX.CSSProperties>(() => {
    const positionState = position();
    const stretch = rootOptions().stretch;
    const arrowStyle = {
      "--arrow-x": `${positionState.arrowX || 0}px`,
      "--arrow-y": `${positionState.arrowY || 0}px`,
    };
    const miscStyle: JSX.CSSProperties = {};
    if (stretch) {
      const { width: triggerWidth, height: triggerHeight } = triggerSize();
      const width = triggerWidth / positionState.scaleX;
      const height = triggerHeight / positionState.scaleY;
      if (stretch.includes("height") && height) {
        miscStyle.height = `${height}px`;
      } else if (stretch.includes("minHeight") && height) {
        miscStyle["min-height"] = `${height}px`;
      }

      if (stretch.includes("width") && width) {
        miscStyle.width = `${width}px`;
      } else if (stretch.includes("minWidth") && width) {
        miscStyle["min-width"] = `${width}px`;
      }
    }
    if (!open()) {
      miscStyle["pointer-events"] = "none";
    }

    const AUTO = "auto";
    const offsetStyle: JSX.CSSProperties = {
      left: "-1000vw",
      top: "-1000vh",
      right: AUTO,
      bottom: AUTO,
    };
    if (positionState.ready || !open()) {
      const { points, dynamicInset } = positionState.align ?? {};
      const alignRight = dynamicInset && points?.[0][1] === "r";
      const alignBottom = dynamicInset && points?.[0][0] === "b";

      if (alignRight) {
        offsetStyle.right = `${positionState.offsetR}px`;
        offsetStyle.left = AUTO;
      } else {
        offsetStyle.left = `${positionState.offsetX}px`;
        offsetStyle.right = AUTO;
      }

      if (alignBottom) {
        offsetStyle.bottom = `${positionState.offsetB}px`;
        offsetStyle.top = AUTO;
      } else {
        offsetStyle.top = `${positionState.offsetY}px`;
        offsetStyle.bottom = AUTO;
      }
    }

    return mergeStyle(
      {
        ...arrowStyle,
        ...offsetStyle,
        ...miscStyle,
        position: "fixed",
        "box-sizing": "border-box",
        "z-index": local.zIndex,
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
        setOpen(false);
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

    setOpen(false);
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
      warning("trigger element and popup element should in same shadow root.", {
        once: true,
        package: "floating",
      });
    }

    makeEventListener(
      listenerRoots,
      "contextmenu",
      onContextMenuClose as EventListener,
      { capture: true } as const,
    );
  });

  useEscKeyDown(open, (e) => {
    if (e.inStackTop) {
      setOpen(false);
    }
  });

  const scrollerList = createMemo(() => {
    const triggerEle = triggerRef();
    const popupEle = popupRef();
    if (!triggerEle || !popupEle) {
      return;
    }
    const win = getWin(popupEle);
    if (!win) return;
    const triggerScrollList = collectScroller(triggerEle);
    const popupScrollList = collectScroller(popupEle);

    return [...new Set([win, ...triggerScrollList, ...popupScrollList])];
  });

  const onScroll = () => {
    void reposition();
    if (open() && rootOptions().alignPoint && hasAction("hide", "click")) {
      setOpen(false);
    }
  };

  const PassiveOptions = { passive: true } as const;
  createEffect(() => {
    const list = scrollerList();

    if (list) {
      makeEventListener(list, "scroll", onScroll, PassiveOptions);
      makeEventListener(list[0], "resize", onScroll, PassiveOptions);
    }

    untrack(() => {
      void reposition();
    });
  });

  createEffect(() => {
    if (!open()) return;

    popupSize();

    untrack(() => {
      void reposition();
    });
  });

  const onMouseLeave: FloatingPopupProps["onMouseLeave"] = (event) => {
    const { relatedTarget } = event;
    if (!hasAction("hide", "hover")) return;
    if (relatedTarget && contains(relatedTarget as Node)) return;

    setOpen(false, rootOptions().delay.hoverClose);
  };

  const onMouseEnter: FloatingPopupProps["onMouseEnter"] = (e) => {
    if (
      hasAction("show", "hover") &&
      open() &&
      popupRef()?.contains(e?.target)
    ) {
      setOpen(true, rootOptions().delay.hoverOpen);
    }
  };

  return (
    <Motion
      visible={open()}
      forceRender={rootOptions().forceRender}
      removeOnLeave={!rootOptions().forceRender}
      ref={mergeRefs(local.ref, setPopupRef)}
      style={popupStyle()}
      aria-hidden={!open()}
      onMouseLeave={composeHandlers(local.onMouseLeave, onMouseLeave)}
      onMouseEnter={composeHandlers(local.onMouseEnter, onMouseEnter)}
      {...motion()}
      {...others}
    />
  );
}
