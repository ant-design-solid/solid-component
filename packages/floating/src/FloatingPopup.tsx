import Motion from "@solid-component/motion";
import { callHandler, mergeStyle } from "@solid-component/utils";
import { createElementSize, makeEventListener, onClickOutside } from "@solid-primitive/web";
import { createEffect, createMemo, splitProps, untrack } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { FloatingMotionConfig } from "./FloatingContext";
import { useFloatingContext } from "./FloatingContext";
import useEscKeyDown from "./hooks/useEscKeyDown";
import { collectScroller, getWin } from "./utils";

export interface FloatingPopupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  zIndex?: number;
  motion?: FloatingMotionConfig;
}

export default function FloatingPopup(props: FloatingPopupProps) {
  const context = useFloatingContext();
  const [local, others] = splitProps(props, [
    "ref",
    "children",
    "zIndex",
    "style",
    "motion",
    "onMouseLeave",
    "onMouseEnter",
  ]);
  const { size: triggerSize } = createElementSize(
    createMemo(() => (context.rootOptions().stretch ? context.triggerRef() : null)),
    { controls: false },
  );
  const { size: popupSize } = createElementSize(context.popupRef, { controls: false });

  const motion = createMemo(() => {
    const motion = local.motion ?? {};
    return {
      ...motion,
      onAppearPrepare: async (...args) => {
        await context.reposition();
        return motion.onAppearPrepare?.(...args);
      },
      onEnterPrepare: async (...args) => {
        await context.reposition();
        return motion.onEnterPrepare?.(...args);
      },
      onVisibleChanged: (visible) => {
        motion.onVisibleChanged?.(visible);
        if (visible) {
          requestAnimationFrame(() => {
            void context.reposition();
          });
        }
      },
    } satisfies FloatingMotionConfig;
  });

  const popupStyle = createMemo<JSX.CSSProperties>(() => {
    const positionState = context.position();
    const open = context.open();
    const stretch = context.rootOptions().stretch;
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
    if (!context.open()) {
      miscStyle["pointer-events"] = "none";
    }

    const AUTO = "auto";
    const offsetStyle: JSX.CSSProperties = {
      left: "-1000vw",
      top: "-1000vh",
      right: AUTO,
      bottom: AUTO,
    };
    if (positionState.ready || !open) {
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
        "box-sizing": "border-box",
        "z-index": local.zIndex,
      },
      local.style,
    );
  });

  onClickOutside(
    context.popupRef,
    () => {
      if (context.hasAction("hide", "click")) {
        context.setOpen(false);
      }
    },
    {
      ignore: [context.triggerRef],
    },
  );

  useEscKeyDown(context.open, (e) => {
    if (e.inStackTop) {
      context.setOpen(false);
    }
  });

  const scrollerList = createMemo(() => {
    const triggerEle = context.triggerRef();
    const popupEle = context.popupRef();
    if (!triggerEle || !popupEle) {
      return;
    }
    const triggerScrollList = collectScroller(triggerEle);
    const popupScrollList = collectScroller(popupEle);

    return [...new Set([getWin(popupEle)!, ...triggerScrollList, ...popupScrollList])];
  });

  const onScroll = () => {
    void context.reposition();
    if (context.open() && context.rootOptions().alignPoint && context.hasAction("hide", "click")) {
      context.setOpen(false);
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
      void context.reposition();
    });
  });

  createEffect(() => {
    if (!context.open()) return;

    popupSize();

    untrack(() => {
      void context.reposition();
    });
  });

  const onMouseLeave: FloatingPopupProps["onMouseLeave"] = (event) => {
    const { relatedTarget } = event;
    if (context.hasAction("hide", "hover") && !relatedTarget) {
      context.setOpen(false);
    }
    callHandler(event, local.onMouseLeave);
  };

  const onMouseEnter: FloatingPopupProps["onMouseEnter"] = (e) => {
    if (
      context.hasAction("show", "hover") &&
      context.open() &&
      context.popupRef()?.contains(e?.target)
    ) {
      context.setOpen(true);
    }
    callHandler(e, local.onMouseEnter);
  };

  return (
    <Motion
      visible={context.open()}
      forceRender={context.rootOptions().forceRender}
      removeOnLeave={!context.rootOptions().forceRender}
      ref={context.setPopupRef}
      style={popupStyle()}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      {...motion()}
      {...(others as Record<string, unknown>)}
    >
      {local.children}
    </Motion>
  );
}
