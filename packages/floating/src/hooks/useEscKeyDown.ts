import { makeEventListener } from "@solid-primitive/event-listener";
import { Accessor, createEffect, createUniqueId, onCleanup } from "solid-js";

export type EscCallback = (
  event: KeyboardEvent & { inStackTop: boolean },
) => void;

let stack: { id: string; onEsc: EscCallback }[] = [];

const IME_LOCK_DURATION = 200;
let lastCompositionEndTime = 0;

function onGlobalKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && !event.isComposing) {
    const now = Date.now();
    if (now - lastCompositionEndTime < IME_LOCK_DURATION) {
      return;
    }
    const len = stack.length;
    for (let i = len - 1; i >= 0; i -= 1) {
      stack[i].onEsc(
        Object.assign(event, {
          inStackTop: i === len - 1,
        }),
      );
    }
  }
}

function onGlobalCompositionEnd() {
  lastCompositionEndTime = Date.now();
}

export default function useEscKeyDown(
  open: Accessor<boolean>,
  onEsc: EscCallback = () => {},
) {
  const id = createUniqueId();
  const onEventEsc = onEsc;
  const ensure = () => {
    if (!stack.find((item) => item.id === id)) {
      stack.push({ id, onEsc: onEventEsc });
    }
  };
  const clear = () => {
    stack = stack.filter((item) => item.id !== id);
  };

  createEffect(() => {
    const opened = open();
    if (opened) {
      ensure();
      const cleanups = [
        makeEventListener(window, "keydown", onGlobalKeyDown),
        makeEventListener(window, "compositionend", onGlobalCompositionEnd),
      ];
      onCleanup(() => {
        clear();
        !stack.length && cleanups.forEach((cleanup) => cleanup);
      });
    } else {
      clear();
    }
  });
}
