import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FloatingAlign } from "../FloatingContext";
import createFloating from "./createFloating";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const withRoot = async <T>(run: () => Promise<T> | T) =>
  new Promise<T>((resolve, reject) => {
    createRoot((dispose) => {
      try {
        Promise.resolve(run()).then(
          (value) => {
            dispose();
            resolve(value);
          },
          (error) => {
            dispose();
            reject(error);
          },
        );
      } catch (error) {
        dispose();
        reject(error);
      }
    });
  });

const setViewport = (width: number, height: number) => {
  Object.defineProperties(document.documentElement, {
    clientWidth: {
      configurable: true,
      value: width,
    },
    clientHeight: {
      configurable: true,
      value: height,
    },
    scrollWidth: {
      configurable: true,
      value: width,
    },
    scrollHeight: {
      configurable: true,
      value: height,
    },
    scrollTop: {
      configurable: true,
      value: 0,
    },
    scrollLeft: {
      configurable: true,
      value: 0,
    },
  });
};

const mockPopup = (rect = { x: 0, y: 0, width: 100, height: 80 }) => {
  const popup = document.createElement("div");
  popup.style.cssText = [
    `width: ${rect.width}px`,
    `height: ${rect.height}px`,
    "background-color: rgb(1, 2, 3)",
    "border-top: 1px solid rgb(10, 0, 0)",
    "border-right: 2px solid rgb(0, 20, 0)",
    "border-bottom: 3px solid rgb(0, 0, 30)",
    "border-left: 4px solid rgb(40, 0, 0)",
  ].join(";");
  document.body.appendChild(popup);

  vi.spyOn(popup, "getBoundingClientRect").mockReturnValue({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    toJSON: () => ({}),
  } as DOMRect);

  return popup;
};

describe("createFloating", () => {
  it("returns updated for the winning reposition call", async () => {
    await withRoot(async () => {
      const popup = document.createElement("div");
      document.body.appendChild(popup);

      vi.spyOn(popup, "getBoundingClientRect").mockReturnValue({
        x: 20,
        y: 10,
        width: 40,
        height: 30,
        top: 10,
        left: 20,
        right: 60,
        bottom: 40,
        toJSON: () => ({}),
      } as DOMRect);

      let isOpen = false;
      let popupElement: HTMLElement | undefined;
      let targetValue: HTMLElement | [number, number] | undefined;

      const [position, reposition] = createFloating(
        () => isOpen,
        () => popupElement,
        () => targetValue,
        () => "top",
        () => ({ top: { points: ["bl", "tl"] } }),
        () => undefined,
      );

      await Promise.resolve();

      isOpen = true;
      popupElement = popup;
      targetValue = [100, 120];

      await expect(reposition()).resolves.toBe("updated");
      expect(position().ready).toBe(true);
    });
  });

  it("returns superseded for an earlier reposition call", async () => {
    await withRoot(async () => {
      const popup = document.createElement("div");
      document.body.appendChild(popup);

      vi.spyOn(popup, "getBoundingClientRect").mockReturnValue({
        x: 20,
        y: 10,
        width: 40,
        height: 30,
        top: 10,
        left: 20,
        right: 60,
        bottom: 40,
        toJSON: () => ({}),
      } as DOMRect);

      let isOpen = false;
      let popupElement: HTMLElement | undefined;
      let targetValue: HTMLElement | [number, number] | undefined;

      const [, reposition] = createFloating(
        () => isOpen,
        () => popupElement,
        () => targetValue,
        () => "top",
        () => ({ top: { points: ["bl", "tl"] } }),
        () => undefined,
      );

      await Promise.resolve();

      isOpen = true;
      popupElement = popup;
      targetValue = [100, 120];

      const first = reposition();
      const second = reposition();

      await expect(first).resolves.toBe("superseded");
      await expect(second).resolves.toBe("updated");
    });
  });

  it("returns skipped when popup or target is unavailable", async () => {
    await withRoot(async () => {
      const [, repositionWithoutPopup] = createFloating(
        () => true,
        () => undefined,
        () => [100, 120],
        () => "top",
        () => ({ top: { points: ["bl", "tl"] } }),
        () => undefined,
      );

      const popup = document.createElement("div");
      document.body.appendChild(popup);

      const [, repositionWithoutTarget] = createFloating(
        () => true,
        () => popup,
        () => undefined,
        () => "top",
        () => ({ top: { points: ["bl", "tl"] } }),
        () => undefined,
      );

      await expect(repositionWithoutPopup()).resolves.toBe("skipped");
      await expect(repositionWithoutTarget()).resolves.toBe("skipped");
    });
  });

  it("preserves placement offset when shift corrects left overflow", async () => {
    await withRoot(async () => {
      const popup = document.createElement("div");
      document.body.appendChild(popup);

      Object.defineProperties(document.documentElement, {
        clientWidth: {
          configurable: true,
          value: 200,
        },
        clientHeight: {
          configurable: true,
          value: 200,
        },
        scrollWidth: {
          configurable: true,
          value: 200,
        },
        scrollHeight: {
          configurable: true,
          value: 200,
        },
        scrollTop: {
          configurable: true,
          value: 0,
        },
        scrollLeft: {
          configurable: true,
          value: 0,
        },
      });

      vi.spyOn(popup, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        width: 40,
        height: 30,
        top: 0,
        left: 0,
        right: 40,
        bottom: 30,
        toJSON: () => ({}),
      } as DOMRect);

      const [position, reposition] = createFloating(
        () => true,
        () => popup,
        () => [0, 20],
        () => "top",
        () => ({
          top: {
            points: ["tl", "tl"],
            offset: [-10, 0],
            overflow: {
              shiftX: true,
            },
          },
        }),
        () => undefined,
      );

      await Promise.resolve();
      await expect(reposition()).resolves.toBe("updated");
      expect(position().offsetX).toBe(-10);
    });
  });

  it("uses final popup edge as arrow direction", async () => {
    const cases = [
      {
        name: "top",
        points: ["bc", "tc"],
        arrowDir: "bottom",
        stroke: "rgb(0, 0, 30)",
        strokeWidth: "3px",
      },
      {
        name: "bottom",
        points: ["tc", "bc"],
        arrowDir: "top",
        stroke: "rgb(10, 0, 0)",
        strokeWidth: "1px",
      },
      {
        name: "left",
        points: ["cr", "cl"],
        arrowDir: "right",
        stroke: "rgb(0, 20, 0)",
        strokeWidth: "2px",
      },
      {
        name: "right",
        points: ["cl", "cr"],
        arrowDir: "left",
        stroke: "rgb(40, 0, 0)",
        strokeWidth: "4px",
      },
    ] as const;

    for (const item of cases) {
      await withRoot(async () => {
        setViewport(500, 500);

        const popup = mockPopup();
        const [position, reposition] = createFloating(
          () => true,
          () => popup,
          () => [200, 200],
          () => item.name,
          () => ({
            [item.name]: {
              points: [...item.points],
            },
          }),
          () => undefined,
        );

        await Promise.resolve();
        await expect(reposition()).resolves.toBe("updated");
        expect(position().align.points).toEqual(item.points);
        expect(position().arrow.dir).toBe(item.arrowDir);
        expect(position().arrow.stroke).toBe(item.stroke);
        expect(position().arrow.strokeWidth).toBe(item.strokeWidth);
      });
    }
  });

  it("stores flipped points before deriving arrow direction", async () => {
    await withRoot(async () => {
      setViewport(300, 300);

      const popup = mockPopup();
      const [position, reposition] = createFloating(
        () => true,
        () => popup,
        () => [150, 250],
        () => "bottom",
        () => ({
          bottom: {
            points: ["tc", "bc"],
            overflow: {
              adjustY: true,
            },
          },
        }),
        () => undefined,
      );

      await Promise.resolve();
      await expect(reposition()).resolves.toBe("updated");
      expect(position().align.points).toEqual(["bc", "tc"]);
      expect(position().arrow.dir).toBe("bottom");
    });
  });

  it("repositions automatically when open or alignment dependencies change", async () => {
    await withRoot(async () => {
      const popup = document.createElement("div");
      document.body.appendChild(popup);

      vi.spyOn(popup, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        width: 40,
        height: 30,
        top: 0,
        left: 0,
        right: 40,
        bottom: 30,
        toJSON: () => ({}),
      } as DOMRect);

      const [open, setOpen] = createSignal(false);
      const [target, setTarget] = createSignal<
        HTMLElement | [number, number] | undefined
      >([100, 120]);
      const [placement, setPlacement] = createSignal("top");
      const [placements, setPlacements] = createSignal({
        top: {
          points: ["tl", "tl"],
          offset: [0, 0] as [number, number],
        },
        bottom: {
          points: ["tl", "tl"],
          offset: [5, 6] as [number, number],
        },
      });
      const [popupAlign, setPopupAlign] = createSignal<
        FloatingAlign | undefined
      >();

      const [position] = createFloating(
        open,
        () => popup,
        target,
        placement,
        placements,
        popupAlign,
      );

      const flushAutoReposition = async () => {
        await Promise.resolve();
        await Promise.resolve();
      };

      setOpen(true);
      await flushAutoReposition();
      expect(position().ready).toBe(true);
      expect(position().offsetX).toBe(100);
      expect(position().offsetY).toBe(120);

      setTarget([130, 150]);
      await flushAutoReposition();
      expect(position().offsetX).toBe(130);
      expect(position().offsetY).toBe(150);

      setPlacement("bottom");
      await flushAutoReposition();
      expect(position().offsetX).toBe(135);
      expect(position().offsetY).toBe(156);

      setPlacements({
        top: {
          points: ["tl", "tl"],
          offset: [0, 0],
        },
        bottom: {
          points: ["tl", "tl"],
          offset: [12, 14],
        },
      });
      await flushAutoReposition();
      expect(position().offsetX).toBe(142);
      expect(position().offsetY).toBe(164);

      setPopupAlign({
        offset: [3, 4],
      });
      await flushAutoReposition();
      expect(position().offsetX).toBe(133);
      expect(position().offsetY).toBe(154);
    });
  });
});
