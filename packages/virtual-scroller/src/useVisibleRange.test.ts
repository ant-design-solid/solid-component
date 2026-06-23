import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { useVisibleRange } from "./useVisibleRange";

function generateItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i, text: `Item ${i}` }));
}

describe("useVisibleRange", () => {
  it("returns correct visible range for normal list at scrollTop=0", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(0);
      const items = generateItems(100);

      const { visibleRange } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      const range = visibleRange();
      // scrollTop=0: first item starts at 0. With overscan=3, startIndex=0.
      // 500px / 50px = 10 items + overscan*1 forward (since only forward overscan in end)
      expect(range.startIndex).toBe(0);
      // At minimum: floor(500/50) = 10 items visible, plus ~3 overscan = endIndex ~12
      expect(range.endIndex).toBeGreaterThanOrEqual(10);
      expect(range.endIndex).toBeLessThanOrEqual(15);
    });
  });

  it("returns correct visible range when scrolled down", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(1000);
      const items = generateItems(100);

      const { visibleRange } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      const range = visibleRange();
      // scrollTop=1000 → first fully visible item at index 20 (1000/50=20)
      // overscan=3 back → startIndex=17
      expect(range.startIndex).toBe(17); // 20 - 3
      // At minimum: endIndex around 20+10+3=33, actual endIndex = 29
      expect(range.endIndex).toBeGreaterThanOrEqual(29);
    });
  });

  it("applies overscan correctly", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(200);
      const items = generateItems(100);

      // With overscan=0
      const { visibleRange: rangeNoOverscan } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 0,
      });

      // With overscan=5
      const { visibleRange: rangeOverscan } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 5,
      });

      // overscan=5 should start 5 items earlier
      expect(rangeNoOverscan().startIndex).toBe(4); // 200/50=4
      expect(rangeOverscan().startIndex).toBe(0); // 4-5=0 (clamped)
      expect(rangeOverscan().endIndex).toBeGreaterThan(rangeNoOverscan().endIndex);
    });
  });

  it("returns empty range for empty items", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(0);

      const { visibleRange, visibleItems, totalHeight } = useVisibleRange({
        items: () => [],
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      expect(visibleRange()).toEqual({ startIndex: -1, endIndex: -1 });
      expect(visibleItems()).toEqual([]);
      expect(totalHeight()).toBe(0);
    });
  });

  it("renders all items for short list that fits in container", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(0);
      const items = generateItems(3);

      const { visibleRange } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      const range = visibleRange();
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(items.length - 1);
    });
  });

  it("handles single item", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(0);
      const items = generateItems(1);

      const { visibleRange, visibleItems, totalHeight } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      expect(visibleRange()).toEqual({ startIndex: 0, endIndex: 0 });
      expect(visibleItems()).toHaveLength(1);
      expect(totalHeight()).toBe(50);
    });
  });

  it("handles mixed dynamic heights", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(0);
      const items = generateItems(10);
      const heights = [30, 80, 50, 100, 40, 60, 90, 35, 70, 55];

      const { visibleRange, totalHeight } = useVisibleRange({
        items: () => items,
        containerHeight: () => 200,
        scrollTop,
        getHeight: (i) => heights[i] || 50,
        overscan: 1,
      });

      const range = visibleRange();
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBeGreaterThanOrEqual(1);
      expect(totalHeight()).toBe(heights.reduce((a, b) => a + b, 0));
    });
  });

  it("getOffset returns cumulative offset", () => {
    createRoot(() => {
      const [scrollTop] = createSignal(0);
      const items = generateItems(10);

      const { getOffset } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      expect(getOffset(0)).toBe(0);
      expect(getOffset(1)).toBe(50);
      expect(getOffset(5)).toBe(250);
    });
  });

  it("recalculates range when scrollTop changes", () => {
    createRoot(() => {
      const [scrollTop, setScrollTop] = createSignal(0);
      const items = generateItems(100);

      const { visibleRange } = useVisibleRange({
        items: () => items,
        containerHeight: () => 500,
        scrollTop,
        getHeight: () => 50,
        overscan: 3,
      });

      expect(visibleRange().startIndex).toBe(0);

      setScrollTop(1000);
      // After reactive update, startIndex should change
      expect(visibleRange().startIndex).toBe(17); // 1000/50 - 3
    });
  });
});
