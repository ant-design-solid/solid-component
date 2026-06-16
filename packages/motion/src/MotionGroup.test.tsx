import { createSignal, For } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import MotionGroup from "./MotionGroup";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

async function waitForActive() {
  await Promise.resolve();
  await nextFrame();
  await nextFrame();
}

describe("MotionGroup", () => {
  it("新增节点首次渲染时先带 enter-start，随后进入 active 并在结束后清理 class", async () => {
    const [items, setItems] = createSignal<string[]>([]);

    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade">
          <For each={items()}>{(item) => <span>{item}</span>}</For>
        </MotionGroup>
      </div>
    ));

    setItems(["A"]);

    const node = host.querySelector("span") as HTMLElement;
    expect(node.classList.contains("fade-enter-start")).toBe(true);
    expect(node.classList.contains("fade-enter-active")).toBe(false);

    await waitForActive();

    expect(node.classList.contains("fade-enter-active")).toBe(true);

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(node.className).toBe("");

    dispose();
  });

  it("删除节点会保留到 leave 结束后再移除", async () => {
    const [items, setItems] = createSignal(["A"]);

    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade" appear={false}>
          <For each={items()}>{(item) => <span>{item}</span>}</For>
        </MotionGroup>
      </div>
    ));

    setItems([]);
    await waitForActive();

    const node = host.querySelector("span") as HTMLElement;
    expect(node.textContent).toBe("A");
    expect(node.classList.contains("fade-leave-active")).toBe(true);

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(host.querySelector("span")).toBeNull();

    dispose();
  });

  it("shows appear-start → appear-active → cleanup for elements present from initial render", async () => {
    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade">
          <span>A</span>
        </MotionGroup>
      </div>
    ));

    // Synchronously after mount: appear-start is set by handleChange
    const node = host.querySelector("span") as HTMLElement;
    expect(node.classList.contains("fade-appear-start")).toBe(true);
    expect(node.classList.contains("fade-appear-active")).toBe(false);

    await waitForActive();

    expect(node.classList.contains("fade-appear-start")).toBe(false);
    expect(node.classList.contains("fade-appear-active")).toBe(true);

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(node.className).toBe("");

    dispose();
  });

  it("does not run appear animation when appear is false", async () => {
    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade" appear={false}>
          <span>A</span>
        </MotionGroup>
      </div>
    ));

    const node = host.querySelector("span") as HTMLElement;
    expect(node.classList.contains("fade-appear-start")).toBe(false);
    expect(node.classList.contains("fade-appear-active")).toBe(false);
    expect(node.className).toBe("");

    dispose();
  });

  it("adds children immediately when enter is disabled", async () => {
    const [items, setItems] = createSignal<string[]>([]);

    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade" enter={false}>
          <For each={items()}>{(item) => <span>{item}</span>}</For>
        </MotionGroup>
      </div>
    ));

    setItems(["A"]);
    await Promise.resolve();

    const node = host.querySelector("span") as HTMLElement;
    expect(node).not.toBeNull();
    expect(node.textContent).toBe("A");
    expect(node.classList.contains("fade-enter-start")).toBe(false);
    expect(node.classList.contains("fade-enter-active")).toBe(false);

    dispose();
  });

  it("removes children immediately when leave is disabled", async () => {
    const [items, setItems] = createSignal(["A"]);

    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade" appear={false} leave={false}>
          <For each={items()}>{(item) => <span>{item}</span>}</For>
        </MotionGroup>
      </div>
    ));

    setItems([]);
    await Promise.resolve();

    // Element removed from DOM immediately (no leave animation)
    expect(host.querySelector("span")).toBeNull();

    dispose();
  });

  it("calls lifecycle callbacks during enter and leave", async () => {
    const onEnterStart = vi.fn();
    const onEnterActive = vi.fn();
    const onLeaveStart = vi.fn();
    const onLeaveActive = vi.fn();
    const [items, setItems] = createSignal<string[]>([]);

    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup
          name="fade"
          onEnterStart={onEnterStart}
          onEnterActive={onEnterActive}
          onLeaveStart={onLeaveStart}
          onLeaveActive={onLeaveActive}
        >
          <For each={items()}>{(item) => <span>{item}</span>}</For>
        </MotionGroup>
      </div>
    ));

    // Add → enter motion
    setItems(["A"]);
    await waitForActive();

    expect(onEnterStart).toHaveBeenCalledTimes(1);
    expect(onEnterActive).toHaveBeenCalledTimes(1);

    const node = host.querySelector("span") as HTMLElement;
    expect(onEnterStart).toHaveBeenCalledWith(node);
    expect(onEnterActive).toHaveBeenCalledWith(node);

    // Finish enter so element is stable
    node.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    // Remove → leave motion
    setItems([]);
    await waitForActive();

    expect(onLeaveStart).toHaveBeenCalledTimes(1);
    expect(onLeaveActive).toHaveBeenCalledTimes(1);
    expect(onLeaveStart).toHaveBeenCalledWith(node);

    // Finish leave
    node.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(host.querySelector("span")).toBeNull();

    dispose();
  });

  it("animates multiple children and handles batch add/remove", async () => {
    const [items, setItems] = createSignal<string[]>(["A", "B"]);

    const { host, dispose } = mount(() => (
      <div>
        <MotionGroup name="fade" appear={false}>
          <For each={items()}>{(item) => <span>{item}</span>}</For>
        </MotionGroup>
      </div>
    ));

    // Both present without animation
    expect(host.querySelectorAll("span")).toHaveLength(2);

    // Add C
    setItems(["A", "B", "C"]);
    await waitForActive();

    let spans = host.querySelectorAll("span");
    expect(spans).toHaveLength(3);

    const newSpan = spans[2] as HTMLElement;
    expect(newSpan.classList.contains("fade-enter-active")).toBe(true);

    newSpan.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();
    expect(newSpan.className).toBe("");

    // Remove A while keeping B, C
    setItems(["B", "C"]);
    await waitForActive();

    // A still in DOM during leave
    spans = host.querySelectorAll("span");
    expect(spans).toHaveLength(3);

    const leavingSpan = spans[0] as HTMLElement;
    expect(leavingSpan.textContent).toBe("A");
    expect(leavingSpan.classList.contains("fade-leave-active")).toBe(true);

    leavingSpan.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(host.querySelectorAll("span")).toHaveLength(2);
    expect(host.querySelectorAll("span")[0]?.textContent).toBe("B");

    dispose();
  });
});
