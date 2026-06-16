import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import Motion from "./Motion";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Motion", () => {
  it("renders children when visible, hides when not visible", () => {
    const { host, dispose } = mount(() => (
      <Motion visible>
        <span>content</span>
      </Motion>
    ));

    expect(host.querySelector("span")).not.toBeNull();
    expect(host.textContent).toBe("content");

    dispose();
  });

  it("does not render children when visible is false", () => {
    const { host, dispose } = mount(() => (
      <Motion visible={false}>
        <span>content</span>
      </Motion>
    ));

    expect(host.querySelector("span")).toBeNull();

    dispose();
  });

  it("runs enter motion and shows content when visible becomes true", async () => {
    const [visible, setVisible] = createSignal(false);
    const onEnterStart = vi.fn();
    const onEnterActive = vi.fn();
    const onVisibleChangeEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <Motion
        visible={visible()}
        onEnterStart={onEnterStart}
        onEnterActive={onEnterActive}
        onVisibleChangeEnd={onVisibleChangeEnd}
      >
        <span>content</span>
      </Motion>
    ));

    expect(host.querySelector("span")).toBeNull();

    setVisible(true);
    await nextFrame();

    expect(onEnterStart).toHaveBeenCalledTimes(1);
    expect(onEnterActive).toHaveBeenCalledTimes(1);
    expect(onVisibleChangeEnd).toHaveBeenCalledWith(true);

    // Content is present before motion completes (present=true during enter)
    expect(host.querySelector("span")).not.toBeNull();

    dispose();
  });

  it("runs leave motion and hides content when visible becomes false", async () => {
    const [visible, setVisible] = createSignal(true);
    const onLeaveStart = vi.fn();
    const onLeaveActive = vi.fn();
    const onVisibleChangeEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <Motion
        visible={visible()}
        onLeaveStart={onLeaveStart}
        onLeaveActive={onLeaveActive}
        onVisibleChangeEnd={onVisibleChangeEnd}
      >
        <span>content</span>
      </Motion>
    ));

    expect(host.querySelector("span")).not.toBeNull();

    setVisible(false);
    await nextFrame();

    expect(onLeaveStart).toHaveBeenCalledTimes(1);
    expect(onLeaveActive).toHaveBeenCalledTimes(1);
    expect(onVisibleChangeEnd).toHaveBeenCalledWith(false);
    expect(host.querySelector("span")).toBeNull();

    dispose();
  });

  it("calls lifecycle callbacks in order during enter", async () => {
    const order: string[] = [];
    const [visible, setVisible] = createSignal(false);

    const { dispose } = mount(() => (
      <Motion
        visible={visible()}
        onEnterPrepare={async () => { order.push("prepare"); }}
        onEnterStart={() => { order.push("start"); }}
        onEnterActive={() => { order.push("active"); }}
        onEnterEnd={() => { order.push("end"); return false; }}
      >
        <span>content</span>
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    expect(order).toEqual(["prepare", "start", "active", "end"]);

    dispose();
  });

  it("applies and removes CSS class names during enter motion", async () => {
    const [visible, setVisible] = createSignal(false);
    const { host, dispose } = mount(() => (
      <Motion visible={visible()} name="fade">
        <span>content</span>
      </Motion>
    ));

    setVisible(true);
    // Motion's advance() yields after each setStep() via async onStep.
    // With no callbacks (name="fade" only), onStep=noop, so await noop()
    // creates a microtask boundary per step:
    //   after 1st microtask → "prepare" done, at "start" setState
    //   after 2nd microtask → "start" done, at "active" setState
    // So after 2×await Promise.resolve(), advance is between start and active.
    await Promise.resolve();
    await Promise.resolve();

    const span = host.querySelector("span") as HTMLElement;
    expect(span.classList.contains("fade-enter-start")).toBe(true);
    expect(span.classList.contains("fade-enter-active")).toBe(false);

    // After rAF, motion advances to "active"
    await nextFrame();

    expect(span.classList.contains("fade-enter-start")).toBe(false);
    expect(span.classList.contains("fade-enter-active")).toBe(true);

    // Finish motion via transitionend
    span.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(span.classList.contains("fade-enter-active")).toBe(false);

    dispose();
  });

  it("keeps children mounted after leave when removeOnLeave is false", async () => {
    const [visible, setVisible] = createSignal(true);
    const onVisibleChangeEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <Motion
        visible={visible()}
        removeOnLeave={false}
        onVisibleChangeEnd={onVisibleChangeEnd}
      >
        <span>content</span>
      </Motion>
    ));

    setVisible(false);
    await nextFrame();

    expect(onVisibleChangeEnd).toHaveBeenCalledWith(false);
    // Children remain in DOM despite visible=false
    expect(host.querySelector("span")).not.toBeNull();

    dispose();
  });

  it("skips appear motion when appear is false", async () => {
    const onAppearStart = vi.fn();
    const onVisibleChangeEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <Motion
        visible
        appear={false}
        onAppearStart={onAppearStart}
        onVisibleChangeEnd={onVisibleChangeEnd}
      >
        <span>content</span>
      </Motion>
    ));

    await Promise.resolve();

    expect(onAppearStart).not.toHaveBeenCalled();
    expect(onVisibleChangeEnd).toHaveBeenCalledWith(true);
    expect(host.querySelector("span")).not.toBeNull();

    dispose();
  });

  it("does not run leave animation when leave is disabled", async () => {
    const onLeaveStart = vi.fn();
    const onLeaveActive = vi.fn();
    const onVisibleChangeEnd = vi.fn();
    const [visible, setVisible] = createSignal(true);

    const { host, dispose } = mount(() => (
      <Motion
        visible={visible()}
        leave={false}
        onLeaveStart={onLeaveStart}
        onLeaveActive={onLeaveActive}
        onVisibleChangeEnd={onVisibleChangeEnd}
      >
        <span>content</span>
      </Motion>
    ));

    setVisible(false);
    await Promise.resolve();

    expect(onLeaveStart).not.toHaveBeenCalled();
    expect(onLeaveActive).not.toHaveBeenCalled();
    expect(onVisibleChangeEnd).toHaveBeenCalledWith(false);
    expect(host.querySelector("span")).toBeNull();

    dispose();
  });

  it("does not run enter animation when enter is disabled", async () => {
    const onEnterStart = vi.fn();
    const onVisibleChangeEnd = vi.fn();
    const [visible, setVisible] = createSignal(false);

    const { host, dispose } = mount(() => (
      <Motion
        visible={visible()}
        enter={false}
        onEnterStart={onEnterStart}
        onVisibleChangeEnd={onVisibleChangeEnd}
      >
        <span>content</span>
      </Motion>
    ));

    setVisible(true);
    await Promise.resolve();

    expect(onEnterStart).not.toHaveBeenCalled();
    // onVisibleChangeEnd is still called — visible becomes true without animation
    expect(onVisibleChangeEnd).toHaveBeenCalledWith(true);
    expect(host.querySelector("span")).not.toBeNull();

    dispose();
  });
});
