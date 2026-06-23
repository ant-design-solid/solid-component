import { type Accessor } from "solid-js";
import type {
  ScrollAlign,
  ScrollItemSize,
  ScrollOffset,
  VirtualItemKey,
} from "./types";

/** 内部索引滚动目标 */
interface ScrollToTarget {
  index?: number;
  key?: VirtualItemKey;
  align?: ScrollAlign;
  offset?: ScrollOffset;
}

/**
 * scrollTo 最大重试次数
 * 用于等待 ResizeObserver 异步测量高度完成
 */
const MAX_RETRY_TIMES = 10;

/**
 * useScrollTo 选项
 */
export interface UseScrollToOptions<T = unknown> {
  /** 容器元素引用（响应式） */
  containerRef: Accessor<HTMLElement | undefined>;
  /** 数据列表（用于 key 定位） */
  items: Accessor<T[]>;
  /** 获取指定项目的稳定 key */
  getItemKey?: (item: T, index: number) => VirtualItemKey | undefined;
  /** 按稳定 key 获取当前索引 */
  getIndexByKey?: (key: VirtualItemKey) => number | undefined;
  /** 获取指定索引项目的高度 */
  getHeight: (index: number) => number;
  /** 获取指定索引项目的累积偏移量 */
  getOffset?: (index: number) => number;
  /** 容器高度（响应式） */
  containerHeight: Accessor<number>;
  /** 同步滚动位置到外部状态 */
  syncScrollTop?: (top: number) => void;
}

/**
 * useScrollTo 返回值
 */
export interface UseScrollToReturn {
  /** 滚动到目标位置
   *
   * - `null` / `undefined` - 无操作
   * - `number` - 滚动到指定像素偏移量
   * - `{ index, align?, offset? }` - 滚动到指定索引
   * - `{ key, align?, offset? }` - 滚动到指定 key
   */
  scrollTo: (arg: number | ScrollToTarget | null | undefined) => void;
}

/**
 * 滚动控制 Hook
 *
 * 提供单一的 `scrollTo` API，支持：
 * - 像素偏移：`scrollTo(400)`
 * - 按索引滚动：`scrollTo({ index: 5, align: 'center' })`
 * - 按 key 滚动：`scrollTo({ key: 'item-5', align: 'start' })`
 *
 * 按索引滚动时内置重试机制：如果项目高度尚未测量完成，
 * 会通过 requestAnimationFrame 重试最多 MAX_RETRY_TIMES=10 次，
 * 等待 ResizeObserver 更新高度后精确定位。
 *
 * @param options - 配置选项
 * @returns 包含 scrollTo 方法的对象
 */
export function useScrollTo<T = unknown>(
  options: UseScrollToOptions<T>,
): UseScrollToReturn {
  const {
    containerRef,
    items,
    getItemKey,
    getIndexByKey,
    getHeight,
    getOffset: getOffsetFromOptions,
    containerHeight,
    syncScrollTop,
  } = options;

  /**
   * 获取指定索引项目的累积偏移量
   */
  const getOffset = (index: number): number => {
    if (getOffsetFromOptions) {
      return getOffsetFromOptions(index);
    }

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getHeight(i);
    }
    return offset;
  };

  const getSize = (index: number): ScrollItemSize => {
    const top = getOffset(index);
    const height = getHeight(index);
    return {
      top,
      bottom: top + height,
      height,
    };
  };

  const resolveTargetIndex = (target: ScrollToTarget): number => {
    if (target.key !== undefined) {
      const cachedIndex = getIndexByKey?.(target.key);
      if (cachedIndex !== undefined) return cachedIndex;

      const currentItems = items?.();
      if (currentItems === undefined || getItemKey === undefined) return -1;

      return currentItems.findIndex((item, index) => {
        return getItemKey(item, index) === target.key;
      });
    }

    return target.index ?? -1;
  };

  const resolveOffset = (
    index: number,
    offset: ScrollOffset | undefined,
  ): number => {
    if (offset === undefined) return 0;

    const value =
      typeof offset === "function"
        ? offset({
            index,
            getSize: (targetIndex = index) => getSize(targetIndex),
          })
        : offset;

    return Number.isFinite(value) ? value : 0;
  };

  /**
   * 执行滚动到指定目标的核心逻辑（支持重试）
   */
  const doScrollToTarget = (
    container: HTMLElement,
    target: ScrollToTarget,
    retryCount: number,
  ) => {
    const index = resolveTargetIndex(target);
    const length = items().length;
    if (index < 0 || index >= length) return;

    const size = getSize(index);
    const extraOffset = resolveOffset(index, target.offset);
    const viewHeight = containerHeight();

    let targetScrollTop: number;
    const align = target.align ?? "auto";

    switch (align) {
      case "start":
        targetScrollTop = size.top + extraOffset;
        break;

      case "center":
        targetScrollTop = size.top - (viewHeight - size.height) / 2 + extraOffset;
        break;

      case "end":
        targetScrollTop = size.bottom - viewHeight + extraOffset;
        break;

      case "auto":
      default: {
        const currentScrollTop = container.scrollTop;

        if (
          size.top >= currentScrollTop &&
          size.bottom <= currentScrollTop + viewHeight
        ) {
          return; // 已经在可见区域内
        }

        targetScrollTop =
          size.top < currentScrollTop
            ? size.top + extraOffset
            : size.bottom - viewHeight + extraOffset;
        break;
      }
    }

    const alignedTop = Math.max(0, targetScrollTop);

    if (syncScrollTop) {
      syncScrollTop(alignedTop);
    } else {
      container.scrollTop = alignedTop;
    }

    if (retryCount < MAX_RETRY_TIMES) {
      requestAnimationFrame(() => {
        doScrollToTarget(container, target, retryCount + 1);
      });
    }
  };

  /**
   * 统一的滚动入口
   *
   * - `null` / `undefined` - 无操作
   * - `number` - 滚动到像素偏移量
   * - `{ index, align?, offset? }` - 滚动到索引
   * - `{ key, align?, offset? }` - 滚动到 key
   */
  const scrollTo = (arg: number | ScrollToTarget | null | undefined) => {
    if (arg === null || arg === undefined) {
      return;
    }

    const container = containerRef();
    if (!container) return;

    if (typeof arg === "number") {
      const alignedTop = Math.max(0, arg);
      if (syncScrollTop) {
        syncScrollTop(alignedTop);
      } else {
        container.scrollTop = alignedTop;
      }
      return;
    }

    doScrollToTarget(container, arg, 0);
  };

  return { scrollTo };
}
