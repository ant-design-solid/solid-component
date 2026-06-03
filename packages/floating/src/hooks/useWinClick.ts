import { warning } from "@solid-component/utils";
import { makeEventListener } from "@solid-primitive/web";
import { DEV, createEffect, type Accessor } from "solid-js";
import { getWin } from "../utils";

function getShadowRoot(node?: Node | null) {
  const root = node?.getRootNode?.();
  return root instanceof ShadowRoot ? root : null;
}

function getEventTarget(event: Event) {
  return event.composedPath?.()[0] ?? event.target;
}

export default function useWinClick(
  open: Accessor<boolean>,
  clickToHide: Accessor<boolean>,
  triggerRef: Accessor<HTMLElement | undefined>,
  popupRef: Accessor<HTMLElement | undefined>,
  contains: (target: EventTarget) => boolean,
  setOpen: (next: boolean) => void,
) {
  let popupPointerDown = false;

  createEffect(() => {
    if (!clickToHide()) {
      return;
    }

    const triggerEle = triggerRef();
    const popupEle = popupRef();

    if (!popupEle) {
      return;
    }

    const win = getWin(popupEle);

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

    const onPointerDown = () => {
      popupPointerDown = false;
    };

    const onTriggerClose = (event: MouseEvent) => {
      const target = getEventTarget(event);

      if (!open() || !target || popupPointerDown || contains(target)) {
        return;
      }

      setOpen(false);
    };

    if (
      DEV &&
      triggerEle &&
      triggerEle.getRootNode?.() !== popupEle.getRootNode?.()
    ) {
      warning("trigger element and popup element should in same shadow root.", {
        once: true,
        package: "floating",
      });
    }

    const pointerDownOptions = {
      capture: true,
      passive: true,
    } as const;
    const closeOptions = { capture: true } as const;

    makeEventListener(
      listenerRoots,
      "pointerdown",
      onPointerDown,
      pointerDownOptions,
    );
    makeEventListener<any>(
      listenerRoots,
      "mousedown",
      onTriggerClose,
      closeOptions,
    );
    makeEventListener<any>(
      listenerRoots,
      "contextmenu",
      onTriggerClose,
      closeOptions,
    );
  });

  return () => {
    popupPointerDown = true;
  };
}
