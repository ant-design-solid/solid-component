import type { JSX } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FloatingContextValue, FloatingRootOptions } from "./FloatingContext";
import FloatingHost from "./FloatingHost";
import { useFloatingHostContext } from "./FloatingContext";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const mount = (view: () => JSX.Element) => {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const dispose = render(view, host);

  return { dispose };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const flushAnimationFrame = async () => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

const flushHostUpdate = async () => {
  await flushMicrotasks();
  await flushAnimationFrame();
  await flushMicrotasks();
};

const rootOptions: FloatingRootOptions = {
  defaultOpen: false,
  placement: "top",
  placements: {},
  alignPoint: false,
  delay: {},
  action: "click",
  singleton: true,
};

function createEntryContext(
  id: string,
  text: string,
  x: number,
  y: number,
) {
  let popupNode: HTMLElement | undefined;
  const [open, setOpenSignal] = createSignal(true);
  const setOpen = vi.fn<FloatingContextValue["setOpen"]>((next) => {
    setOpenSignal((prev) => (typeof next === "function" ? next(prev) : next));
  });
  const reposition = vi.fn(async () => "updated" as const);

  const context: FloatingContextValue = {
    id,
    open,
    setOpen,
    triggerRef: () => undefined,
    setTriggerRef: vi.fn(),
    popupRef: () => popupNode,
    setPopupRef: (node) => {
      popupNode = node;
    },
    position: () => ({
      ready: true,
      offsetX: x,
      offsetY: y,
      offsetR: 0,
      offsetB: 0,
      arrowX: 0,
      arrowY: 0,
      scaleX: 1,
      scaleY: 1,
      align: {},
    }),
    reposition,
    hasAction: vi.fn(() => false) as FloatingContextValue["hasAction"],
    setPointerPoint: vi.fn(),
    rootOptions: () => rootOptions,
    registerSubPopup: vi.fn(),
    contains: vi.fn(() => false),
  };

  return {
    context,
    props: () => ({
      style: {
        width: "120px",
        padding: "8px",
      },
      children: text,
    }),
    reposition,
    setOpen,
    popupNode: () => popupNode,
  };
}

describe("FloatingHost", () => {
  it("renders the active singleton entry with the normal popup view", async () => {
    const entry = createEntryContext("first", "first popup", 16, 24);

    const Harness = () => {
      const host = useFloatingHostContext();

      onMount(() => {
        if (!host) return;

        host.register({
          id: "first",
          context: entry.context,
          props: entry.props,
        });
        host.activate("first");

        onCleanup(() => host.unregister("first"));
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    expect(entry.popupNode()).toBeInstanceOf(HTMLElement);
    expect(entry.popupNode()?.style.position).toBe("fixed");
    expect(entry.popupNode()?.style.left).toBe("16px");
    expect(entry.popupNode()?.style.top).toBe("24px");
    expect(entry.popupNode()?.style.width).toBe("120px");
    expect(document.body.textContent).toContain("first popup");

    dispose();
  });

  it("closes the previous singleton entry when another entry activates", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);

    const Harness = () => {
      const host = useFloatingHostContext();

      onMount(() => {
        if (!host) return;

        host.register({
          id: "first",
          context: first.context,
          props: first.props,
        });
        host.register({
          id: "second",
          context: second.context,
          props: second.props,
        });

        host.activate("first");
        host.activate("second");

        onCleanup(() => {
          host.unregister("first");
          host.unregister("second");
        });
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    expect(first.setOpen).toHaveBeenCalledWith(false);
    expect(second.reposition).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("first popup");
    expect(document.body.textContent).toContain("second popup");

    dispose();
  });
});
