import { createResizeObserver } from "@solid-primitive/resize-observer";
import { type Accessor, createSignal } from "solid-js";
import type { Size } from "../types";

/**
 * 监听元素尺寸变化的原语
 *
 * @param element - 要监听的元素（响应式）
 * @returns 元素尺寸（响应式）
 */
export function useSize(element: Accessor<HTMLElement | undefined>): Accessor<Size> {
  const [size, setSize] = createSignal<Size>({ width: 0, height: 0 });

  createResizeObserver(element, (entries) => {
    const entry = entries[0];
    if (entry) {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });

  return size;
}
