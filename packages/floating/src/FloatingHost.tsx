import Motion from "@solid-component/motion";
import { chain, mergeRefs, mergeStyle } from "@solid-component/utils";
import { ReactiveMap } from "@solid-primitive/map";
import {
  batch,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  mergeProps,
  Show,
  splitProps,
  type JSX,
} from "solid-js";
import FloatingContext, {
  FloatingHostContext,
  FloatingHostSmooth,
  useFloatingContext,
  type FloatingContextValue,
  type FloatingHostContextValue,
  type FloatingMotionConfig,
  type FloatingPopupEntry,
} from "./FloatingContext";
import { FloatingPopupView, type FloatingPopupSize } from "./FloatingPopup";
import { getOffsetStyle } from "./utils";

interface FloatingHostProps {
  children?: JSX.Element;
  smooth?: FloatingHostSmooth;
}

type HostPhase = "closed" | "opening" | "open" | "switching" | "closing";

const DEFAULT_SMOOTH_TRANSITION = "all 0.1s";

const SMOOTH_ROOT_VISUAL_RESET: JSX.CSSProperties = {
  background: "transparent",
  "background-color": "transparent",
  "border-color": "transparent",
  "box-shadow": "none",
  outline: "none",
  "z-index": 1,
};

export default function FloatingHost(props: FloatingHostProps) {
  const entries = new ReactiveMap<string, FloatingPopupEntry>();
  const [activeId, setActiveId] = createSignal<string>();
  const [phase, setPhase] = createSignal<HostPhase>("closed");
  const [motionOpen, setMotionOpen] = createSignal(false);
  const [hostedPopupRef, setHostedPopupRef] = createSignal<HTMLElement>();
  const [popupSize, setPopupSize] = createSignal<FloatingPopupSize>();
  const hostOpen = createMemo(() => {
    const current = phase();
    return (
      current === "opening" || current === "open" || current === "switching"
    );
  });
  const activeEntry = createMemo(() => {
    const id = activeId();
    return id ? entries.get(id) : undefined;
  });
  const activeContext = createMemo(() => {
    const entry = activeEntry();
    const context = entry?.context;
    if (!context) return;
    return {
      ...context,
      open: motionOpen,
    } satisfies FloatingContextValue;
  });

  let activeAt = 0;
  let motionToken = 0;
  const handoffIds = new Set<string>();

  const smooth = () => props.smooth;
  const smoothTransition = () => {
    const s = smooth();
    return s
      ? s === true
        ? DEFAULT_SMOOTH_TRANSITION
        : (s.transition ?? DEFAULT_SMOOTH_TRANSITION)
      : !!s;
  };

  const isEntryOpen = (entry: FloatingPopupEntry) => entry.context.open();

  const findLatestOpenEntry = (excludeId?: string) => {
    let next: FloatingPopupEntry | undefined;

    for (const entry of entries.values()) {
      if (
        entry.id === excludeId ||
        handoffIds.has(entry.id) ||
        !isEntryOpen(entry)
      ) {
        continue;
      }

      if (!next || entry.activeAt > next.activeAt) {
        next = entry;
      }
    }

    return next;
  };

  const cleanupActiveEntry = (id: string) => {
    batch(() => {
      entries.get(id)?.context.setPopupRef(undefined);
      setHostedPopupRef(undefined);
      setPopupSize(undefined);
      setActiveId(undefined);
      setMotionOpen(false);
      setPhase("closed");
    });
  };

  const commitActiveEntry = (id: string) => {
    const nextEntry = entries.get(id);

    if (!nextEntry) {
      return;
    }

    const prevId = activeId();
    const prevEntry = prevId ? entries.get(prevId) : undefined;
    const node = hostedPopupRef();

    if (prevEntry && prevEntry !== nextEntry) {
      prevEntry.context.setPopupRef(undefined);
    }

    setActiveId(id);
    nextEntry.context.setPopupRef(node);
  };

  const openActiveEntry = (id: string) => {
    const nextEntry = entries.get(id);

    if (!nextEntry || !isEntryOpen(nextEntry)) {
      return;
    }

    motionToken += 1;

    batch(() => {
      commitActiveEntry(id);
      setPhase("opening");
      setMotionOpen(true);
    });
  };

  const switchActiveEntry = (id: string) => {
    const nextEntry = entries.get(id);

    if (!nextEntry || !isEntryOpen(nextEntry)) {
      return;
    }

    const token = ++motionToken;
    const prevId = activeId();

    batch(() => {
      if (prevId && prevId !== id) {
        handoffIds.add(prevId);
      }
      commitActiveEntry(id);
      setPhase("switching");
      setMotionOpen(false);
    });

    requestAnimationFrame(() => {
      const entry = entries.get(id);

      if (token !== motionToken || activeId() !== id || !entry) {
        return;
      }

      if (isEntryOpen(entry)) {
        batch(() => {
          setPhase("opening");
          setMotionOpen(true);
        });
      } else {
        deactivateEntry(id);
      }
    });
  };

  const activateEntry = (entry: FloatingPopupEntry) => {
    activeAt += 1;
    entry.activeAt = activeAt;
    handoffIds.delete(entry.id);

    const currentPhase = phase();
    const currentId = activeId();

    if (!currentId || currentPhase === "closed" || currentPhase === "closing") {
      openActiveEntry(entry.id);
      return;
    }

    if (currentId === entry.id) {
      if (!motionOpen()) {
        openActiveEntry(entry.id);
      }
      return;
    }

    switchActiveEntry(entry.id);
  };

  const deactivateEntry = (id: string) => {
    if (activeId() !== id) {
      return;
    }

    const next = findLatestOpenEntry(id);

    if (next) {
      activateEntry(next);
    } else {
      motionToken += 1;

      batch(() => {
        setPhase("closing");
        setMotionOpen(false);
      });
    }
  };

  const handleHostOpenChangeEnd = (entryId: string, open: boolean) => {
    if (open) {
      if (phase() === "opening" || phase() === "switching") {
        setPhase("open");
      }

      const entry = entries.get(entryId);
      if (activeId() === entryId && entry && !isEntryOpen(entry)) {
        deactivateEntry(entryId);
      }

      return;
    }

    if (phase() !== "closing") {
      return;
    }

    const closedId = activeId();

    if (closedId && activeId() === closedId) {
      cleanupActiveEntry(closedId);
    }
  };

  const register: FloatingHostContextValue["register"] = (entry) => {
    const entryId = entry.id;
    const prevEntry = entries.get(entryId);

    entries.set(entryId, {
      ...entry,
      activeAt: prevEntry?.activeAt ?? 0,
    });

    return () => {
      const wasActive = activeId() === entryId;

      entries.delete(entryId);

      if (wasActive) {
        deactivateEntry(entryId);
      }

      handoffIds.delete(entryId);
    };
  };

  const context = {
    smooth,
    open: hostOpen,
    isActive: createSelector(activeId),
    activeContext,

    register,
    activate(id) {
      const entry = entries.get(id);
      if (!entry) {
        return;
      }

      activateEntry(entry);
    },
    deactivate: deactivateEntry,
  } satisfies FloatingHostContextValue;

  return (
    <FloatingHostContext.Provider value={context}>
      {props.children}
      <Show when={activeEntry()}>
        {(entry) => {
          const popupProps = () => entry().props;
          const context = () => entry().context;

          const activeContext = {
            get id() {
              return context().id;
            },
            state: () => context().state(),
            update: (...args) => context().update(...args),

            open: hostOpen,
            setOpen: (...args) => context().setOpen(...args),

            triggerRef: () => context().triggerRef(),
            popupRef: (...args) => context().popupRef(...args),
            setTriggerRef: (...args) => context().setTriggerRef(...args),
            setPopupRef: (...args) => context().setPopupRef(...args),
            setPointerPoint: (...args) => context().setPointerPoint(...args),
            hasAction: (...args) => context().hasAction(...args),
            registerSubPopup: (...args) => context().registerSubPopup(...args),
            contains: (...args) => context().contains(...args),
            host: () => context().host(),
            rootOptions: () => context().rootOptions(),
          } satisfies FloatingContextValue;

          const surfaceProps = () => {
            const [local] = splitProps(popupProps(), [
              "class",
              "style",
              "zIndex",
              "motion",
            ]);

            return local;
          };

          return (
            <FloatingContext.Provider value={activeContext}>
              <Show when={smoothTransition()}>
                {(transition) => (
                  <FloatingHostSmoothSurface
                    size={popupSize()}
                    transition={transition()}
                    visible={hostOpen()}
                    {...surfaceProps()}
                  />
                )}
              </Show>
              <FloatingPopupView
                {...popupProps()}
                motion={{
                  ...popupProps().motion,
                  onVisibleChangeEnd(visible) {
                    popupProps().motion?.onVisibleChangeEnd?.(visible);
                    handleHostOpenChangeEnd(context().id, visible);
                  },
                }}
                onResize={chain([setPopupSize, popupProps().onResize])}
                ref={mergeRefs(popupProps().ref, setHostedPopupRef)}
                style={
                  smooth()
                    ? mergeStyle(popupProps().style, SMOOTH_ROOT_VISUAL_RESET)
                    : popupProps().style
                }
              />
            </FloatingContext.Provider>
          );
        }}
      </Show>
    </FloatingHostContext.Provider>
  );
}

function FloatingHostSmoothSurface(props: {
  class?: string;
  motion?: FloatingMotionConfig;
  size?: FloatingPopupSize;
  style?: string | JSX.CSSProperties;
  transition: string;
  visible: boolean;
  zIndex?: number;
}) {
  const context = useFloatingContext();
  let cachedOffsetStyle: JSX.CSSProperties | undefined;
  const [transitionReady, setTransitionReady] = createSignal(false);

  const outerStyle = createMemo(() => {
    const positionState = context.state();
    const hadReadyOffset = !!cachedOffsetStyle;
    const size = props.size;
    const offsetStyle = getOffsetStyle(props.visible, positionState);

    if (positionState.ready) {
      cachedOffsetStyle = offsetStyle;
    }

    return mergeStyle(
      {
        ...(cachedOffsetStyle ?? offsetStyle),
        "box-sizing": "border-box",
        "pointer-events": "none",
        position: "fixed",
        "z-index": props.zIndex,
        height: size?.height != null ? `${size.height}px` : undefined,
        transition:
          hadReadyOffset && transitionReady() && props.visible
            ? props.transition
            : undefined,
        width: size?.width != null ? `${size.width}px` : undefined,
      },
      props.style,
    ) satisfies JSX.CSSProperties;
  });

  createEffect(() => {
    if (props.visible && cachedOffsetStyle && context.state().ready) {
      setTransitionReady(true);
    }
  });

  return (
    <Motion
      forceRender
      removeOnLeave={false}
      visible={props.visible}
      {...mergeProps(props.motion, {
        onVisibleChangeEnd: (visible: boolean) => {
          props.motion?.onVisibleChangeEnd?.(visible);
          setTransitionReady(visible);
          if (!visible) {
            cachedOffsetStyle = undefined;
          }
        },
      })}
    >
      <div style={outerStyle()} aria-hidden="true" class={props.class} />
    </Motion>
  );
}
