import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { mount, nextFrame } from "../../.test/render";
import Slider from ".";

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

describe("SliderRoot", () => {
  it("keeps the dragged thumb stable when values cross", async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    const { host, dispose } = mount(() => {
      const [value, setValue] = createSignal<number[]>([20, 80]);

      return (
        <Slider.Root
          value={value()}
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          onChangeEnd={onChangeEnd}
          style={{ width: "100px", height: "20px" }}
        >
          <Slider.Rail data-testid="track">
            <Slider.Track />
          </Slider.Rail>
          <Slider.Thumbs>
            {(thumb) => <Slider.Thumb id={thumb.id} data-thumb-id={thumb.id} />}
          </Slider.Thumbs>
        </Slider.Root>
      );
    });

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    const track = root.querySelector('[data-testid="track"]') as HTMLElement;
    mockClientRect(track, { left: 0, width: 100 });

    const thumbsBefore = root.querySelectorAll('[role="slider"]');
    const firstThumb = thumbsBefore[0] as HTMLElement;
    const secondThumb = thumbsBefore[1] as HTMLElement;

    firstThumb.focus();
    await nextFrame();

    firstThumb.dispatchEvent(createPointerEvent("pointerdown", { clientX: 20 }));
    await nextFrame();

    root.dispatchEvent(createPointerEvent("pointermove", { clientX: 90 }));
    await nextFrame();

    const thumbsAfter = root.querySelectorAll('[role="slider"]');

    expect(onChange).toHaveBeenLastCalledWith([80, 90]);
    expect(thumbsAfter[0]).toBe(firstThumb);
    expect(thumbsAfter[1]).toBe(secondThumb);
    expect(document.activeElement).toBe(firstThumb);

    root.dispatchEvent(createPointerEvent("pointerup", { clientX: 90 }));
    await nextFrame();

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenLastCalledWith([80, 90]);

    dispose();
  });

  it("focuses the resolved thumb from track pointerdown and commits on pointerup", async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    const { host, dispose } = mount(() => {
      const [value, setValue] = createSignal<number[]>([20, 80]);

      return (
        <Slider.Root
          value={value()}
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          onChangeEnd={onChangeEnd}
          style={{ width: "100px", height: "20px" }}
        >
          <Slider.Rail data-testid="track">
            <Slider.Track />
          </Slider.Rail>
          <Slider.Thumbs />
        </Slider.Root>
      );
    });

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    const track = root.querySelector('[data-testid="track"]') as HTMLElement;
    const thumbs = root.querySelectorAll('[role="slider"]');
    mockClientRect(track, { left: 0, width: 100 });

    track.dispatchEvent(createPointerEvent("pointerdown", { clientX: 65 }));
    await nextFrame();

    expect(document.activeElement).toBe(thumbs[1]);
    expect(onChange).toHaveBeenLastCalledWith([20, 65]);
    expect(onChangeEnd).not.toHaveBeenCalled();

    track.dispatchEvent(createPointerEvent("pointerup", { clientX: 65 }));
    await nextFrame();

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenLastCalledWith([20, 65]);

    dispose();
  });

  it("commits keyboard changes once on blur", async () => {
    const onChangeEnd = vi.fn();

    const { host, dispose } = mount(() => {
      const [value, setValue] = createSignal(20);

      return (
        <Slider.Root
          value={value()}
          onChange={setValue}
          onChangeEnd={onChangeEnd}
          style={{ width: "100px", height: "20px" }}
        >
          <Slider.Rail>
            <Slider.Track />
          </Slider.Rail>
          <Slider.Thumbs />
        </Slider.Root>
      );
    });

    await nextFrame();

    const thumb = host.querySelector('[role="slider"]') as HTMLElement;

    thumb.focus();
    await nextFrame();

    thumb.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    await nextFrame();
    thumb.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    await nextFrame();

    expect(onChangeEnd).not.toHaveBeenCalled();

    thumb.blur();
    await nextFrame();

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenLastCalledWith(22);

    dispose();
  });

  it("commits pending changes when the active thumb changes", async () => {
    const onChangeEnd = vi.fn();

    const { host, dispose } = mount(() => {
      const [value, setValue] = createSignal<number[]>([20, 80]);

      return (
        <Slider.Root
          value={value()}
          onChange={setValue}
          onChangeEnd={onChangeEnd}
          style={{ width: "100px", height: "20px" }}
        >
          <Slider.Rail data-testid="track">
            <Slider.Track />
          </Slider.Rail>
          <Slider.Thumbs />
        </Slider.Root>
      );
    });

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    const track = root.querySelector('[data-testid="track"]') as HTMLElement;
    const thumbs = root.querySelectorAll('[role="slider"]');
    const firstThumb = thumbs[0] as HTMLElement;
    mockClientRect(track, { left: 0, width: 100 });

    firstThumb.focus();
    await nextFrame();
    firstThumb.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    await nextFrame();

    expect(onChangeEnd).not.toHaveBeenCalled();

    track.dispatchEvent(createPointerEvent("pointerdown", { clientX: 65 }));
    await nextFrame();

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenLastCalledWith([21, 80]);
    expect(document.activeElement).toBe(thumbs[1]);

    track.dispatchEvent(createPointerEvent("pointerup", { clientX: 65 }));
    await nextFrame();

    expect(onChangeEnd).toHaveBeenCalledTimes(2);
    expect(onChangeEnd).toHaveBeenLastCalledWith([21, 65]);

    dispose();
  });
});
