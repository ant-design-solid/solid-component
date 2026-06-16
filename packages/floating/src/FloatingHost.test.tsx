import type { JSX } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FloatingContextValue,
  FloatingRootOptions,
} from "./FloatingContext";
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

const getRenderedPopup = () =>
  document.body.querySelector<HTMLElement>('[aria-hidden="false"]');

const rootOptions: FloatingRootOptions = {
  defaultOpen: false,
  placement: "top",
  placements: {},
  alignPoint: false,
  delay: {},
  action: "click",
  singleton: true,
};

function createEntryContext(id: string, text: string, x: number, y: number) {
  let popupNode: HTMLElement | undefined;
  const [open, setOpenSignal] = createSignal(true);
  const setOpen = vi.fn<FloatingContextValue["setOpen"]>((next) => {
    setOpenSignal((prev) => (typeof next === "function" ? next(prev) : next));
  });
  const update = vi.fn(async () => "updated" as const);

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
    state: () => ({
      ready: true,
      offsetX: x,
      offsetY: y,
      offsetR: 0,
      offsetB: 0,
      scaleX: 1,
      scaleY: 1,
      align: {},
      arrow: {
        x: 0,
        y: 0,
        fill: "none",
      },
    }),
    update,
    hasAction: vi.fn(() => false) as FloatingContextValue["hasAction"],
    setPointerPoint: vi.fn(),
    rootOptions: () => rootOptions,
    registerSubPopup: vi.fn(),
    contains: vi.fn(() => false),
  };

  return {
    context,
    props: {
      style: {
        width: "120px",
        padding: "8px",
      },
      children: text,
    },
    update,
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

        const unregister = host.register({
          id: "first",
          context: entry.context,
          props: entry.props,
        });
        host.activate("first");

        onCleanup(unregister);
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

  it("switches active singleton entry without closing the previous root state", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);

    const Harness = () => {
      const host = useFloatingHostContext();

      onMount(() => {
        if (!host) return;

        const unregisterFirst = host.register({
          id: "first",
          context: first.context,
          props: first.props,
        });
        const unregisterSecond = host.register({
          id: "second",
          context: second.context,
          props: second.props,
        });

        host.activate("first");
        host.activate("second");

        onCleanup(() => {
          unregisterFirst();
          unregisterSecond();
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

    expect(first.setOpen).not.toHaveBeenCalledWith(false);
    expect(second.update).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("first popup");
    expect(document.body.textContent).toContain("second popup");

    dispose();
  });
});

describe("FloatingHost smooth", () => {
  it("exposes smooth state and active context via context", async () => {
    let capturedContext: ReturnType<typeof useFloatingHostContext> = undefined;

    const Harness = () => {
      capturedContext = useFloatingHostContext();
      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    await flushMicrotasks();

    expect(capturedContext).toBeDefined();

    dispose();
  });

  it("activates an entry when smooth is enabled", async () => {
    const entry = createEntryContext("first", "first popup", 16, 24);

    const Harness = () => {
      const host = useFloatingHostContext();

      onMount(() => {
        if (!host) return;

        const unregister = host.register({
          id: "first",
          context: entry.context,
          props: entry.props,
        });
        host.activate("first");

        onCleanup(unregister);
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    expect(entry.popupNode()).toBeInstanceOf(HTMLElement);
    expect(document.body.textContent).toContain("first popup");

    dispose();
  });

  it("does not cause recursive activation between two open entries", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);

    // Start with only first open
    const [firstOpenSignal, setFirstOpen] = createSignal(true);
    const [secondOpenSignal, setSecondOpen] = createSignal(false);
    first.context.open = firstOpenSignal;
    second.context.open = secondOpenSignal;

    let hostRef: ReturnType<typeof useFloatingHostContext> = undefined;

    const Harness = () => {
      const host = useFloatingHostContext();
      hostRef = host;

      const unregisterFirst = host!.register({
        id: "first",
        context: first.context,
        props: first.props,
      });
      const unregisterSecond = host!.register({
        id: "second",
        context: second.context,
        props: second.props,
      });

      // Simulate the edge-detection effect from FloatingPopup
      createEffect((wasOpen) => {
        const nextOpen = first.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("first");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("first");
        }
        return nextOpen;
      }, false);

      createEffect((wasOpen) => {
        const nextOpen = second.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("second");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("second");
        }
        return nextOpen;
      }, false);

      onCleanup(() => {
        unregisterFirst();
        unregisterSecond();
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    // Initial effect fires for first only (wasOpen=false, open=true)
    await flushHostUpdate();
    expect(document.body.textContent).toContain("first popup");

    // Activate second — should switch without Maximum call stack error
    setSecondOpen(true);
    await flushHostUpdate();

    expect(document.body.textContent).toContain("second popup");

    dispose();
  });

  it("hands the rendered popup node to the active entry when switching", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);
    const [firstOpenSignal, setFirstOpen] = createSignal(true);
    const [secondOpenSignal, setSecondOpen] = createSignal(false);
    first.context.open = firstOpenSignal;
    second.context.open = secondOpenSignal;

    const Harness = () => {
      const host = useFloatingHostContext();
      const unregisterFirst = host!.register({
        id: "first",
        context: first.context,
        props: first.props,
      });
      const unregisterSecond = host!.register({
        id: "second",
        context: second.context,
        props: second.props,
      });

      createEffect((wasOpen) => {
        const nextOpen = first.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("first");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("first");
        }
        return nextOpen;
      }, false);

      createEffect((wasOpen) => {
        const nextOpen = second.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("second");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("second");
        }
        return nextOpen;
      }, false);

      onCleanup(() => {
        unregisterFirst();
        unregisterSecond();
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    const firstNode = first.popupNode();
    expect(firstNode).toBeInstanceOf(HTMLElement);
    expect(second.popupNode()).toBeUndefined();

    setSecondOpen(true);
    await flushHostUpdate();

    expect(first.popupNode()).toBeUndefined();
    expect(second.popupNode()).toBeInstanceOf(HTMLElement);
    expect(second.update).toHaveBeenCalled();
    expect(document.body.textContent).toContain("second popup");

    setFirstOpen(false);
    dispose();
  });

  it("restarts motion open when switching active entries", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);
    const [firstOpenSignal] = createSignal(true);
    const [secondOpenSignal, setSecondOpen] = createSignal(false);
    const openRecords: boolean[] = [];
    first.context.open = firstOpenSignal;
    second.context.open = secondOpenSignal;

    const Harness = () => {
      const host = useFloatingHostContext();
      const unregisterFirst = host!.register({
        id: "first",
        context: first.context,
        props: first.props,
      });
      const unregisterSecond = host!.register({
        id: "second",
        context: second.context,
        props: second.props,
      });

      createEffect((wasOpen) => {
        const nextOpen = first.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("first");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("first");
        }
        return nextOpen;
      }, false);

      createEffect((wasOpen) => {
        const nextOpen = second.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("second");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("second");
        }
        return nextOpen;
      }, false);

      createEffect(() => {
        const activeContext = host!.activeContext();
        if (!activeContext) return;

        openRecords.push(activeContext.open());
      });

      onCleanup(() => {
        unregisterFirst();
        unregisterSecond();
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    setSecondOpen(true);
    await flushHostUpdate();

    expect(openRecords).toEqual([true, false, true]);

    dispose();
  });

  it("keeps smooth surface visible while content motion restarts on switch", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);
    const [firstOpenSignal] = createSignal(true);
    const [secondOpenSignal, setSecondOpen] = createSignal(false);
    first.context.open = firstOpenSignal;
    second.context.open = secondOpenSignal;

    const getSurface = () =>
      [...document.body.querySelectorAll<HTMLElement>('[aria-hidden="true"]')]
        .find((node) => node.textContent === "");

    const Harness = () => {
      const host = useFloatingHostContext();
      const unregisterFirst = host!.register({
        id: "first",
        context: first.context,
        props: first.props,
      });
      const unregisterSecond = host!.register({
        id: "second",
        context: second.context,
        props: second.props,
      });

      createEffect((wasOpen) => {
        const nextOpen = first.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("first");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("first");
        }
        return nextOpen;
      }, false);

      createEffect((wasOpen) => {
        const nextOpen = second.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("second");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("second");
        }
        return nextOpen;
      }, false);

      onCleanup(() => {
        unregisterFirst();
        unregisterSecond();
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    expect(getSurface()?.style.display).not.toBe("none");
    expect(getSurface()?.style.transition).not.toBe("none");

    setSecondOpen(true);
    await flushMicrotasks();

    expect(getSurface()).toBeInstanceOf(HTMLElement);
    expect(getSurface()?.style.display).not.toBe("none");
    expect(getSurface()?.style.transition).not.toBe("none");

    dispose();
  });

  it("does not reactivate the previous root when the switched active entry closes", async () => {
    const first = createEntryContext("first", "first popup", 16, 24);
    const second = createEntryContext("second", "second popup", 48, 64);
    const [firstOpenSignal] = createSignal(true);
    const [secondOpenSignal, setSecondOpen] = createSignal(false);
    first.context.open = firstOpenSignal;
    second.context.open = secondOpenSignal;

    const Harness = () => {
      const host = useFloatingHostContext();
      const unregisterFirst = host!.register({
        id: "first",
        context: first.context,
        props: first.props,
      });
      const unregisterSecond = host!.register({
        id: "second",
        context: second.context,
        props: second.props,
      });

      createEffect((wasOpen) => {
        const nextOpen = first.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("first");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("first");
        }
        return nextOpen;
      }, false);

      createEffect((wasOpen) => {
        const nextOpen = second.context.open();
        if (nextOpen && !wasOpen) {
          host!.activate("second");
        } else if (!nextOpen && wasOpen) {
          host!.deactivate("second");
        }
        return nextOpen;
      }, false);

      onCleanup(() => {
        unregisterFirst();
        unregisterSecond();
      });

      return null;
    };

    const { dispose } = mount(() => (
      <FloatingHost smooth>
        <Harness />
      </FloatingHost>
    ));

    await flushHostUpdate();

    setSecondOpen(true);
    await flushHostUpdate();

    expect(document.body.textContent).toContain("second popup");

    setSecondOpen(false);
    await flushHostUpdate();

    expect(document.body.textContent).not.toContain("first popup");
    expect(document.body.textContent).not.toContain("second popup");

    dispose();
  });
});
