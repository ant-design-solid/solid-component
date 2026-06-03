import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import useWinClick from "./useWinClick";

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

describe("useWinClick", () => {
  it("closes on outside mousedown and contextmenu", async () => {
    await withRoot(async () => {
      const trigger = document.createElement("button");
      const popup = document.createElement("div");
      const setOpen = vi.fn();

      document.body.append(trigger, popup);

      useWinClick(
        () => true,
        () => true,
        () => trigger,
        () => popup,
        (target) =>
          target instanceof Node &&
          (target === trigger ||
            target === popup ||
            trigger.contains(target) ||
            popup.contains(target)),
        setOpen,
      );

      await Promise.resolve();

      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(setOpen).toHaveBeenCalledTimes(1);
      expect(setOpen).toHaveBeenLastCalledWith(false);

      setOpen.mockClear();

      document.body.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true }),
      );
      expect(setOpen).toHaveBeenCalledTimes(1);
      expect(setOpen).toHaveBeenLastCalledWith(false);
    });
  });

  it("does not close when the interaction happens inside trigger or popup", async () => {
    await withRoot(async () => {
      const trigger = document.createElement("button");
      const popup = document.createElement("div");
      const popupChild = document.createElement("span");
      const setOpen = vi.fn();

      popup.appendChild(popupChild);
      document.body.append(trigger, popup);

      const onPopupPointerDown = useWinClick(
        () => true,
        () => true,
        () => trigger,
        () => popup,
        (target) =>
          target instanceof Node &&
          (target === trigger ||
            target === popup ||
            trigger.contains(target) ||
            popup.contains(target)),
        setOpen,
      );

      await Promise.resolve();

      onPopupPointerDown();
      popupChild.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

      expect(setOpen).not.toHaveBeenCalled();
    });
  });

  it("does not attach close listeners when outside click closing is disabled", async () => {
    await withRoot(async () => {
      const trigger = document.createElement("button");
      const popup = document.createElement("div");
      const setOpen = vi.fn();

      document.body.append(trigger, popup);

      useWinClick(
        () => true,
        () => false,
        () => trigger,
        () => popup,
        () => false,
        setOpen,
      );

      await Promise.resolve();

      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      document.body.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true }),
      );

      expect(setOpen).not.toHaveBeenCalled();
    });
  });
});
