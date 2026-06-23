import { type Accessor, createMemo } from "solid-js";
import type { VisibleItem, VisibleRange } from "./types";

/**
 * useVisibleRange 选项
 */
export interface UseVisibleRangeOptions<T> {
  /** 数据列表（响应式） */
  items: Accessor<T[]>;
  /** 容器高度（响应式） */
  containerHeight: Accessor<number>;
  /** 滚动位置（响应式） */
  scrollTop: Accessor<number>;
  /** 是否启用虚拟范围裁剪 */
  virtual?: Accessor<boolean>;
  /** 获取指定索引项目的高度 */
  getHeight: (index: number) => number;
  /** overscan 数量（可见区域外预渲染的项目数） */
  overscan?: number;
}

/**
 * useVisibleRange 返回值
 */
export interface UseVisibleRangeReturn<T> {
  /** 可见范围 */
  visibleRange: Accessor<VisibleRange>;
  /** 可见项目列表（包含偏移量） */
  visibleItems: Accessor<VisibleItem<T>[]>;
  /** 总高度 */
  totalHeight: Accessor<number>;
  /** 获取指定索引项目的偏移量 */
  getOffset: (index: number) => number;
}

function lowerBound(values: number[], target: number): number {
  let left = 0;
  let right = values.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (values[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

function upperBound(values: number[], target: number): number {
  let left = 0;
  let right = values.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (values[mid] <= target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * 可见范围计算 Hook
 *
 * 根据滚动位置和容器高度计算可见的项目范围。
 * 支持 overscan 缓冲区，在可见区域外预渲染项目。
 *
 * @param options - 配置选项
 * @returns 可见范围相关的方法和状态
 */
export function useVisibleRange<T>(
  options: UseVisibleRangeOptions<T>,
): UseVisibleRangeReturn<T> {
  const {
    items,
    containerHeight,
    scrollTop,
    virtual,
    getHeight,
    overscan = 3,
  } = options;

  /**
   * 高度前缀和。
   *
   * offsets[index] 是第 index 个项目顶部偏移，offsets[length] 是总高度。
   * getHeight 内部会订阅高度缓存版本号，所以测量变化后这里会自动重建。
   */
  const offsets = createMemo<number[]>(() => {
    const currentItems = items();
    const result = new Array<number>(currentItems.length + 1);
    result[0] = 0;

    for (let i = 0; i < currentItems.length; i++) {
      result[i + 1] = result[i] + getHeight(i);
    }

    return result;
  });

  /**
   * 获取指定索引项目的偏移量
   */
  const getOffset = (index: number): number => {
    const currentOffsets = offsets();
    const safeIndex = Math.max(0, Math.min(index, currentOffsets.length - 1));
    return currentOffsets[safeIndex] ?? 0;
  };

  /**
   * 计算可见范围
   */
  const visibleRange = createMemo<VisibleRange>(() => {
    const currentItems = items();
    const currentScrollTop = scrollTop();
    const currentContainerHeight = containerHeight();

    if (currentItems.length === 0) {
      return [-1, -1];
    }

    if (virtual?.() === false) {
      return [0, currentItems.length - 1];
    }

    const currentOffsets = offsets();
    const lastIndex = currentItems.length - 1;

    // 找到起始索引：第一个底部进入可见区域的项目
    const visibleStartIndex = Math.max(
      0,
      Math.min(upperBound(currentOffsets, currentScrollTop) - 1, lastIndex),
    );

    // 应用 overscan（向前扩展）
    const startIndex = Math.max(0, visibleStartIndex - overscan);

    // 找到结束索引：视口底部之前最后一个项目，再向后扩展 overscan
    const viewportEnd = currentScrollTop + currentContainerHeight;
    const visibleEndIndex = Math.max(
      startIndex,
      Math.min(lowerBound(currentOffsets, viewportEnd) - 1, lastIndex),
    );
    const endIndex = Math.min(lastIndex, visibleEndIndex + overscan);

    return [startIndex, endIndex];
  });

  /**
   * 可见项目列表（包含偏移量和高度）
   */
  const visibleItems = createMemo<VisibleItem<T>[]>(() => {
    const [startIndex, endIndex] = visibleRange();
    const currentItems = items();
    if (startIndex < 0) return [];

    const result: VisibleItem<T>[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        data: currentItems[i],
        height: getHeight(i),
        offsetTop: getOffset(i),
      });
    }

    return result;
  });

  /**
   * 总高度
   */
  const totalHeight = createMemo<number>(() => {
    const currentOffsets = offsets();
    return currentOffsets[currentOffsets.length - 1] ?? 0;
  });

  return {
    visibleRange,
    visibleItems,
    totalHeight,
    getOffset,
  };
}
