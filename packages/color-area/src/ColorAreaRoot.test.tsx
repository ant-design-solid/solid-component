import { afterEach, describe, expect, it } from "vitest";
import { createSignal } from "solid-js";
import { mount, nextFrame } from "../../.test/render";
import ColorArea from ".";
import { Color } from "./utils";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ColorAreaRoot", () => {
  it("keeps hue stable when a controlled color becomes gray", async () => {
    const { host, dispose } = mount(() => {
      const [color, setColor] = createSignal(new Color("#1677ff"));

      return (
        <ColorArea.Root
          value={color()}
          onChange={setColor}
          style={{
            position: "relative",
            height: "150px",
            width: "150px",
          }}
        >
          <ColorArea.Thumb
            style={{
              display: "block",
              width: "16px",
              height: "16px",
              background: "var(--color-current)",
            }}
          />
        </ColorArea.Root>
      );
    });

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();

    const thumb = root.firstElementChild as HTMLElement;
    expect(thumb).toBeTruthy();

    const initialBackground = root.style.backgroundColor;
    expect(initialBackground).toBeTruthy();

    Object.defineProperty(root, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 150,
        height: 150,
        left: 0,
        right: 150,
        top: 0,
        width: 150,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    root.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 0,
        clientY: 75,
        isPrimary: true,
        pointerId: 1,
      }),
    );
    root.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        button: 0,
        clientX: 0,
        clientY: 75,
        isPrimary: true,
        pointerId: 1,
      }),
    );
    root.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        clientX: 0,
        clientY: 75,
        isPrimary: true,
        pointerId: 1,
      }),
    );

    await nextFrame();

    const nextColor = thumb.style.getPropertyValue("--color-current");

    expect(root.style.backgroundColor).toBe(initialBackground);
    expect(nextColor).toBe("rgb(128,128,128)");

    dispose();
  });
});
