import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { mount, nextFrame } from "../../.test/render";
import { Color } from "@solid-component/utils";
import ColorSlider from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function mockClientRect(element: HTMLElement, rect: Partial<DOMRect>) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 20),
      height: rect.height ?? 20,
      left: rect.left ?? 0,
      right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 100),
      top: rect.top ?? 0,
      width: rect.width ?? 100,
      x: rect.x ?? rect.left ?? 0,
      y: rect.y ?? rect.top ?? 0,
      toJSON: () => {},
    }),
  });
}

function createPointerEvent(
  type: string,
  init: PointerEventInit = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX: 0,
    isPrimary: true,
    pointerId: 1,
    ...init,
  });
}

describe("ColorSliderRoot", () => {
  it("updates hue and keeps color as the single source of truth", async () => {
    const onChangeEnd = vi.fn();

    const { host, dispose } = mount(() => {
      const [color, setColor] = createSignal(new Color("#1677ff"));

      return (
        <ColorSlider.Root
          value={color()}
          type="hue"
          onChange={setColor}
          onChangeEnd={onChangeEnd}
          style={{ width: "100px", height: "20px" }}
        >
        <ColorSlider.Rail data-testid="rail">
          <ColorSlider.Thumb />
        </ColorSlider.Rail>
        </ColorSlider.Root>
      );
    });

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    const rail = root.querySelector('[data-testid="rail"]') as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;
    mockClientRect(rail, { left: 0, width: 100 });

    rail.dispatchEvent(createPointerEvent("pointerdown", { clientX: 50 }));
    await nextFrame();

    expect(thumb.getAttribute("aria-valuenow")).toBe("180");
    expect(thumb.getAttribute("aria-valuetext")).toBe("Hue 180 degrees");

    rail.dispatchEvent(createPointerEvent("pointerup", { clientX: 50 }));
    await nextFrame();

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd.mock.calls[0]?.[0].toHsv().h).toBe(180);

    dispose();
  });

  it("renders alpha rail from transparent to solid color", async () => {
    const { host, dispose } = mount(() => (
      <ColorSlider.Root
        defaultValue={new Color("rgba(22, 119, 255, 0.5)")}
        type="alpha"
        style={{ width: "100px", height: "20px" }}
      >
        <ColorSlider.Rail data-testid="rail">
          <ColorSlider.Thumb />
        </ColorSlider.Rail>
      </ColorSlider.Root>
    ));

    await nextFrame();

    const rail = host.querySelector('[data-testid="rail"]') as HTMLElement;
    expect(rail.style.backgroundImage).toContain("linear-gradient");
    expect(rail.style.backgroundImage).toContain("rgb(22, 119, 255)");
    expect(rail.style.backgroundSize).toBe("100% 100%, 8px 8px, 8px 8px");
    expect(rail.style.backgroundPosition).toBe("0px 0px, 0px 0px, 4px 4px");

    dispose();
  });

  it("updates value channel and exposes brightness valuetext", async () => {
    const { host, dispose } = mount(() => {
      const [color, setColor] = createSignal(new Color("#1677ff"));

      return (
        <ColorSlider.Root
          value={color()}
          type="value"
          onChange={setColor}
          style={{ width: "100px", height: "20px" }}
        >
        <ColorSlider.Rail data-testid="rail">
          <ColorSlider.Thumb />
        </ColorSlider.Rail>
        </ColorSlider.Root>
      );
    });

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    const rail = root.querySelector('[data-testid="rail"]') as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;
    mockClientRect(rail, { left: 0, width: 100 });

    rail.dispatchEvent(createPointerEvent("pointerdown", { clientX: 25 }));
    await nextFrame();

    expect(thumb.getAttribute("aria-valuenow")).toBe("25");
    expect(thumb.getAttribute("aria-valuetext")).toBe("Brightness 25 percent");

    dispose();
  });
});
