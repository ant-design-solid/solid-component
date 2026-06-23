import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { VirtualScroller, type VirtualScrollerRef } from "./VirtualScroller";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mount = (view: () => JSX.Element) => {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const dispose = render(view, host);

  return { host, dispose };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("VirtualScroller", () => {
  beforeEach(() => {
    globalThis.ResizeObserver = MockResizeObserver as any;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete (globalThis as any).ResizeObserver;
  });

  const testItems = Array.from({ length: 100 }, (_, index) => ({
    id: index,
    text: `Item ${index}`,
  }));

  it("renders all items when virtual is disabled", () => {
    const { host, dispose } = mount(() => (
      <VirtualScroller
        items={testItems}
        height={500}
        estimatedItemHeight={50}
        virtual={false}
      >
        {(item) => <div data-item={item.id}>{item.text}</div>}
      </VirtualScroller>
    ));

    expect(host.querySelectorAll("[data-item]")).toHaveLength(testItems.length);

    dispose();
  });

  it("exposes nativeElement, getScrollInfo and scrollTo through ref", () => {
    let api: VirtualScrollerRef | undefined;

    const { dispose } = mount(() => (
      <VirtualScroller
        ref={(value) => {
          api = value;
        }}
        items={testItems}
        height={500}
        estimatedItemHeight={50}
      >
        {(item) => <div>{item.text}</div>}
      </VirtualScroller>
    ));

    expect(api?.nativeElement).toBeInstanceOf(HTMLDivElement);

    api?.scrollTo(400);

    expect(api?.nativeElement?.scrollTop).toBe(400);
    expect(api?.getScrollInfo()).toEqual({ x: 0, y: 400 });

    dispose();
  });

  it("updates pooled slot content when scroll position changes", async () => {
    let api: VirtualScrollerRef | undefined;
    const [items] = createSignal(testItems);

    const { host, dispose } = mount(() => (
      <VirtualScroller
        ref={(value) => {
          api = value;
        }}
        items={items()}
        height={100}
        estimatedItemHeight={50}
        overscan={0}
      >
        {(item) => <div data-item={item.id}>{item.text}</div>}
      </VirtualScroller>
    ));

    expect(host.textContent).toContain("Item 0");

    api?.scrollTo({ index: 8, align: "start" });
    await flushMicrotasks();

    expect(host.textContent).toContain("Item 8");

    dispose();
  });

  it("applies innerProps and renders extra content with range info", () => {
    const { host, dispose } = mount(() => (
      <VirtualScroller
        items={testItems}
        height={100}
        estimatedItemHeight={50}
        overscan={0}
        innerProps={{
          "data-inner": "yes",
          class: "virtual-inner",
        }}
        extraRender={(info) => (
          <div data-extra>{`${info.start}:${info.end}:${info.virtual}`}</div>
        )}
      >
        {(item) => <div data-item={item.id}>{item.text}</div>}
      </VirtualScroller>
    ));

    const inner = host.querySelector("[data-inner='yes']");
    expect(inner).toBeInstanceOf(HTMLDivElement);
    expect(inner?.classList.contains("virtual-inner")).toBe(true);
    expect(host.querySelector("[data-extra]")?.textContent).toBe("0:0:true");

    dispose();
  });
});
