import { getShadowRoot, warning } from "@solid-component/utils";
import { createElementSize } from "@solid-primitive/element-geometry";
import {
  makeEventListener,
  onClickOutside,
} from "@solid-primitive/event-listener";
import { ValueOf } from "@solid-primitive/utils";
import {
  createEffect,
  createMemo,
  DEV,
  mergeProps,
  Show,
  untrack,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import type { FloatingMotionConfig } from "./FloatingContext";
import { useFloatingContext } from "./FloatingContext";
import type { FloatingPopupOwnProps } from "./FloatingPopup";
import useEscKeyDown from "./hooks/useEscKeyDown";
import { collectScroller, getWin } from "./utils";

export function createFloatingPopupShared(local: FloatingPopupOwnProps) {
  const context = useFloatingContext();
  const {
    contains,
    hasAction,
    open,
    popupRef,
    reposition,
    rootOptions,
    triggerRef,
  } = context;
  const setPopupRef = context.setPopupRef;
  const close = (delay?: number) => context.setOpen(false, delay);
  const scheduleReposition = () => {
    requestAnimationFrame(() => {
      void reposition();
    });
  };

  const { size: triggerSize } = createElementSize(
    createMemo(() => (rootOptions().stretch ? triggerRef() : null)),
    { controls: false },
  );
  const { size: popupSize } = createElementSize(popupRef, {
    controls: false,
  });

  const interceptors = {
    onAppearPrepare: async (...args) => {
      await reposition();
      return local.motion?.onAppearPrepare?.(...args);
    },
    onEnterPrepare: async (...args) => {
      await reposition();
      return local.motion?.onEnterPrepare?.(...args);
    },
    onVisibleChangeEnd: (visible) => {
      local.motion?.onVisibleChangeEnd?.(visible);
      rootOptions().onOpenChangeEnd?.(visible);
      if (visible) {
        scheduleReposition();
      }
    },
  } satisfies FloatingMotionConfig;
  const motion = createMemo(() => mergeProps(local.motion, interceptors));

  const portal = () => (local.portal === true ? {} : local.portal);

  const positionStyle = createMemo<JSX.CSSProperties>(() => {
    const positionState = context.position();
    const AUTO = "auto";
    let left = "-1000vw";
    let top = "-1000vh";
    let right = AUTO;
    let bottom = AUTO;

    if (positionState.ready || !open()) {
      const { points, dynamicInset } = positionState.align ?? {};
      const alignRight = dynamicInset && points?.[0][1] === "r";
      const alignBottom = dynamicInset && points?.[0][0] === "b";

      if (alignRight) {
        right = `${positionState.offsetR}px`;
        left = AUTO;
      } else {
        left = `${positionState.offsetX}px`;
      }

      if (alignBottom) {
        bottom = `${positionState.offsetB}px`;
        top = AUTO;
      } else {
        top = `${positionState.offsetY}px`;
      }
    }

    return {
      bottom,
      left,
      position: "fixed",
      "pointer-events": open() ? undefined : "none",
      right,
      top,
      "z-index": local.zIndex,
    };
  });

  const surfaceStyle = createMemo<JSX.CSSProperties>(() => {
    const positionState = context.position();
    const stretch = rootOptions().stretch;
    const style: JSX.CSSProperties = {
      "--arrow-x": `${positionState.arrowX || 0}px`,
      "--arrow-y": `${positionState.arrowY || 0}px`,
      "box-sizing": "border-box",
    };

    if (stretch) {
      const { width: triggerWidth, height: triggerHeight } = triggerSize();
      const width = triggerWidth / positionState.scaleX;
      const height = triggerHeight / positionState.scaleY;

      if (stretch.includes("height") && height) {
        style.height = `${height}px`;
      } else if (stretch.includes("minHeight") && height) {
        style["min-height"] = `${height}px`;
      }

      if (stretch.includes("width") && width) {
        style.width = `${width}px`;
      } else if (stretch.includes("minWidth") && width) {
        style["min-width"] = `${width}px`;
      }
    }

    return style;
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

  const onMouseLeave: JSX.HTMLAttributes<HTMLElement>["onMouseLeave"] = (
    event,
  ) => {
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
      context.setOpen(true, rootOptions().delay.hoverOpen);
    }
  };

  return {
    portal,
    Portal: (props: { children: JSX.Element }) => (
      <Show when={portal()} fallback={props.children}>
        {(portalProps) => <Portal {...portalProps()}>{props.children}</Portal>}
      </Show>
    ),
    presence: {
      open,
      forceRender: () => rootOptions().forceRender,
      motion,
    },
    shell: {
      ref: setPopupRef,
      style: positionStyle,
      onMouseEnter,
      onMouseLeave,
    },
    surface: {
      style: surfaceStyle,
    },
  };
}
