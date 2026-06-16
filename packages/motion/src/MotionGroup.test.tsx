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
});
