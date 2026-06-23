import { createTaskQueue } from "@solid-primitive/scheduler";
import {
  Accessor,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  on,
  untrack,
  type Setter,
} from "solid-js";
import { useSize } from "./primitives/useSize";
import type {
  ContainerProps,
  ScrollInfo,
  ScrollItemSize,
  ScrollToArg,
  UseVirtualScrollOptions,
  VisibleItem,
} from "./types";
import {
  useFrameWheel,
  type FireFoxDOMMouseScrollEvent,
} from "./useFrameWheel";
import { useHeights } from "./useHeights";
import { useMobileTouchMove } from "./useMobileTouchMove";
import { useScrollDrag } from "./useScrollDrag";
import { useScrollTo } from "./useScrollTo";
import { useVisibleRange } from "./useVisibleRange";
import { useEventListener } from "@solid-primitive/event-listener";

function isSameVisibleItem<T>(
  previous: VisibleItem<T> | null,
  next: VisibleItem<T> | null,
): boolean {
  if (previous === next) return true;
  if (previous === null || next === null) return false;

  return (
    previous.index === next.index &&
    previous.data === next.data &&
    previous.height === next.height &&
    previous.offsetTop === next.offsetTop
  );
}

/**
 * useVirtualScroll - 虚拟滚动主 Hook
 *
 * 提供完整的虚拟滚动功能，包括：
 * - 动态高度测量和缓存
 * - 可见范围计算
 * - 滚动位置控制
 * - Shift Anchor 锚点机制（数据变化时保持滚动位置稳定）
 * - RTL 支持
 * - 水平滚动支持
 * - 滚轮事件优化
 * - 移动端触摸支持
 * - 拖拽滚动支持
 *
 * @param options - 配置选项
 * @returns 虚拟滚动相关的方法和状态
 *
 * @example
 * ```tsx
 * // 基础用法（<For> 模式，滚动时 DOM 会增删）
 * const {
 *   containerProps,
 *   visibleItems,
 *   startOffset,
 *   measureItem,
 *   totalHeight,
 * } = useVirtualScroll({
 *   items: () => items,
 *   height: () => 500,
 *   estimatedItemHeight: () => 50,
 * });
 *
 * return (
 *   <div {...containerProps()}>
 *     <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
 *       <For each={visibleItems()}>
 *         {(item) => (
 *           <div
 *             ref={(el) => measureItem(item.index, el)}
 *             style={{ position: "absolute", top: `${item.offsetTop}px`, height: `${item.height}px` }}
 *           >
 *             {item.data.text}
 *           </div>
 *         )}
 *       </For>
 *     </div>
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // 性能优化模式（<Index> + stableItems，DOM 节点池化，滚动时不增删 DOM）
 * const { containerProps, stableItems, startOffset, measureItem, totalHeight } = useVirtualScroll({
 *   items: () => items,
 *   height: () => 500,
 *   estimatedItemHeight: () => 50,
 * });
 *
 * return (
 *   <div {...containerProps()}>
 *     <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
 *       <Index each={stableItems()}>{(getSlot) => {
 *         const item = getSlot();
 *         let el: HTMLDivElement | undefined;
 *         createEffect(() => { if (item && el) measureItem(item.index, el); });
 *         return (
 *           <Show when={item}>
 *             <div ref={el!} style={{ position: "absolute", top: `${item!.offsetTop}px`, height: `${item!.height}px` }}>
 *               {item!.data.text}
 *             </div>
 *           </Show>
 *         );
 *       }}</Index>
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualScroll<T>(options: UseVirtualScrollOptions<T>) {
  const {
    items,
    itemKey,
    height,
    estimatedItemHeight,
    overscan = 3,
    direction,
    scrollWidth,
    scrollMoving,
    virtual: virtualProp,
    fullHeight: fullHeightProp,
    onHeightChange,
    onScroll,
    onVisibleChange,
    onVirtualScroll,
  } = options;

  // ======================== 状态 =======================
  const [containerRef, setContainerRef] = createSignal<HTMLElement>();

  // 滚动位置
  const [offsetTop, setOffsetTop] = createSignal(0);
  const [offsetLeft, setOffsetLeft] = createSignal(0);

  // rAF 节流的滚动任务队列：同一帧内的多次滚动事件只处理最后一次
  const scrollQueue = createTaskQueue({
    schedule: "animationFrame",
    strategy: "latest",
  });

  // ======================== 计算属性 ========================

  // 方向
  const isRTL = createMemo(() => direction?.() === "rtl");

  // 是否启用虚拟滚动
  const useVirtual = createMemo(() => {
    const v = virtualProp?.() ?? true;
    return v && !!height() && !!estimatedItemHeight();
  });

  // 容器尺寸
  const containerSize = useSize(containerRef);

  const [heights, measureItem] = useHeights({
    items,
    itemKey,
    estimatedItemHeight,
    onHeightChange,
  });

  const getHeight = (index: number) =>
    heights.get(items()[index], index) ?? estimatedItemHeight();

  const keyIndexMap = createMemo(() => {
    const currentItems = items();
    const map = new Map<string | number, number>();

    for (let index = 0; index < currentItems.length; index++) {
      const key = heights.getItemKey(currentItems[index], index);
      if (key !== undefined) {
        map.set(key, index);
      }
    }

    return map;
  });

  // ======================== 可见范围 ========================

  const {
    visibleRange,
    visibleItems,
    totalHeight: rawTotalHeight,
    getOffset,
  } = useVisibleRange({
    items,
    containerHeight: () => containerSize().height,
    scrollTop: offsetTop,
    virtual: useVirtual,
    getHeight,
    overscan,
  });

  // ======================== 总高度 ========================

  /**
   * 内容总高度。
   * 如果启用了 fullHeight，则至少等于容器高度（防止空列表或内容不足时无滚动区域）。
   */
  const totalHeight = createMemo(() => {
    const raw = rawTotalHeight();
    if (fullHeightProp?.()) {
      return Math.max(raw, height());
    }
    return raw;
  });

  // 是否处于虚拟滚动模式（内容超出容器）
  const inVirtual = createMemo(() => {
    if (!useVirtual()) return false;
    const totalH = totalHeight();
    const sw = scrollWidth?.() ?? 0;
    return totalH > height() || sw > 0;
  });

  // 最大滚动高度
  const maxScrollHeight = createMemo(() => {
    const totalH = totalHeight();
    return Math.max(0, totalH - height());
  });

  // ======================== 固定 Slot 池（DOM 节点回收） ========================

  /**
   * 固定 slot 数量。
   * 基于容器高度和 estimatedItemHeight 计算一个稳定的上限，
   * 确保 stableItems 长度在滚动过程中不变，从而避免 DOM 节点增删。
   */
  const slotCount = createMemo(() => {
    const containerH = height();
    const est = estimatedItemHeight();
    if (!containerH || !est) return 0;

    // 可见区最多能容纳的项目数 + overscan 余量 + 安全余量
    const maxVisible = Math.ceil(containerH / est);
    return maxVisible + 2 * overscan + 3;
  });

  const slotSignals: [
    Accessor<VisibleItem<T> | null>,
    Setter<VisibleItem<T> | null>,
  ][] = [];
  const [slotTrack, slotDirty] = createSignal(undefined, { equals: false });
  function ensureSlotCount(count: number) {
    if (slotSignals.length === count) return;

    while (slotSignals.length < count) {
      const signals = createSignal<VisibleItem<T> | null>(null, {
        equals: isSameVisibleItem,
      });
      slotSignals.push(signals);
    }

    while (slotSignals.length > count) {
      const signal = slotSignals.pop();
      signal?.[1]?.(null);
    }

    slotDirty(undefined);
  }

  createComputed(() => {
    const visItems = visibleItems();
    const count = slotCount();

    ensureSlotCount(count);
    batch(() => {
      for (let i = 0; i < count; i++) {
        const signal = slotSignals[i];
        signal[1]?.(i < visItems.length ? visItems[i] : null);
      }
    });
  });

  /**
   * 固定长度 slot 数组。
   * 与 `<Index>` 配合使用，长度在组件生命周期内稳定，
   * 滚动时只更新 slot 内的数据，不增删 DOM 节点。
   * 超出实际可见项目的 slot 值为 null。
   */
  const stableItems = createMemo<(VisibleItem<T> | null)[]>(() => {
    slotTrack();
    return slotSignals.map(([slot]) => slot());
  });

  /**
   * Shift Anchor 锚点机制 + 数据量回退
   *
   * 数据变化时保持滚动位置稳定。
   *
   * 原理（两遍扫描，不依赖中间状态）：
   *   1. 用旧数据找到锚点 —— 当前 scrollTop 落在哪个项目上
   *   2. itemKey 存在时按 key 找回同一逻辑项目，否则按旧索引恢复
   *
   * 锚点失效（索引越界）时回退到 maxScrollHeight 钳位。
   */
  createEffect<T[]>((prevItems) => {
    const currentItems = items();

    untrack(() => {
      if (prevItems && prevItems.length > 0 && prevItems !== currentItems) {
        // --- save anchor: 用旧数据找到锚点 ---
        let anchorIndex = -1;
        let anchorKey: string | number | undefined;
        let anchorOffset = 0;
        {
          let curOff = 0;
          const st = offsetTop();
          for (let i = 0; i < prevItems.length; i++) {
            const h = heights.get(prevItems[i], i)!;
            if (curOff + h > st) {
              anchorIndex = i;
              anchorKey = heights.getItemKey(prevItems[i], i);
              anchorOffset = st - curOff;
              break;
            }
            curOff += h;
          }
        }

        // --- restore anchor: 用新数据重算滚动位置 ---
        const nextAnchorIndex =
          anchorKey !== undefined
            ? (keyIndexMap().get(anchorKey) ?? -1)
            : anchorIndex;

        if (nextAnchorIndex >= 0 && nextAnchorIndex < currentItems.length) {
          let newScrollTop = 0;
          for (let i = 0; i < nextAnchorIndex; i++) {
            newScrollTop += heights.get(currentItems[i], i)!;
          }
          newScrollTop += anchorOffset;
          syncScrollTop(Math.max(0, newScrollTop));
          return;
        }
      }

      // 备选：超出最大滚动高度时回退
      const max = maxScrollHeight();
      const top = offsetTop();
      if (top > max) {
        syncScrollTop(max);
      }
    });

    return currentItems;
  });

  // ======================== 高度同步 ========================

  /**
   * 当第一个可见项的实际测量高度与 estimatedItemHeight 不同时，
   * 同步修正 scrollTop 以避免滚动位置跳动。
   */
  createEffect(() => {
    const changedIndices = heights.getChangedIndices();

    if (changedIndices.size === 1) {
      const index = Array.from(changedIndices)[0];
      const [startIndex] = visibleRange();

      if (startIndex === index) {
        const measuredHeight = getHeight(index);
        const estimated = untrack(estimatedItemHeight);

        if (measuredHeight !== estimated) {
          const diff = measuredHeight - estimated;
          syncScrollTop((prev) => prev + diff);
        }
      }
    }

    heights.resetChangedIndices();
  });

  // ======================== 滚动控制 ========================

  const { scrollTo: scrollToHook } = useScrollTo({
    containerRef: containerRef,
    items,
    getItemKey: heights.getItemKey,
    getIndexByKey: (key) => keyIndexMap().get(key),
    getHeight,
    getOffset,
    containerHeight: () => containerSize().height,
    syncScrollTop,
  });

  const getScrollInfo = (): ScrollInfo => ({
    x: isRTL() ? -offsetLeft() : offsetLeft(),
    y: offsetTop(),
  });

  const getItemSize = (index: number): ScrollItemSize => {
    const top = getOffset(index);
    const itemHeight = getHeight(index);
    return {
      top,
      bottom: top + itemHeight,
      height: itemHeight,
    };
  };

  let lastVirtualScrollInfo: ScrollInfo = getScrollInfo();

  function triggerVirtualScroll() {
    if (!onVirtualScroll) return;

    const nextInfo = getScrollInfo();
    if (
      nextInfo.x === lastVirtualScrollInfo.x &&
      nextInfo.y === lastVirtualScrollInfo.y
    ) {
      return;
    }

    lastVirtualScrollInfo = nextInfo;
    onVirtualScroll(nextInfo);
  }

  // ======================== 滚动边界检测 ========================

  const isScrollAtTop = createMemo(() => offsetTop() <= 0);
  const isScrollAtBottom = createMemo(() => offsetTop() >= maxScrollHeight());
  const isScrollAtLeft = createMemo(() => offsetLeft() <= 0);
  const isScrollAtRight = createMemo(() => {
    const sw = scrollWidth?.() ?? 0;
    return sw <= 0 || offsetLeft() >= sw - containerSize().width;
  });

  // ======================== 滚动范围限制 ========================

  /**
   * 限制垂直滚动范围
   */
  function keepInRange(newScrollTop: number): number {
    let newTop = newScrollTop;
    const max = maxScrollHeight();
    if (!Number.isNaN(max)) {
      newTop = Math.min(newTop, max);
    }
    newTop = Math.max(newTop, 0);
    return newTop;
  }

  /**
   * 限制水平滚动范围
   */
  function keepInHorizontalRange(nextOffsetLeft: number): number {
    let tmpOffsetLeft = nextOffsetLeft;
    const sw = scrollWidth?.() ?? 0;
    const max = sw > 0 ? sw - containerSize().width : 0;
    if (!Number.isNaN(max)) {
      tmpOffsetLeft = Math.min(tmpOffsetLeft, max);
    }
    tmpOffsetLeft = Math.max(tmpOffsetLeft, 0);
    return tmpOffsetLeft;
  }

  // ======================== 同步滚动位置 ========================

  /**
   * 同步垂直滚动位置到容器
   */
  function syncScrollTop(newTop: number | ((prev: number) => number)) {
    setOffsetTop((origin) => {
      let value: number;
      if (typeof newTop === "function") {
        value = newTop(origin);
      } else {
        value = newTop;
      }
      const alignedTop = keepInRange(value);
      const containerElement = containerRef();
      if (containerElement) {
        containerElement.scrollTop = alignedTop;
      }
      return alignedTop;
    });
  }

  /**
   * 同步水平滚动位置到容器
   */
  function syncScrollLeft(newLeft: number | ((prev: number) => number)) {
    setOffsetLeft((origin) => {
      let value: number;
      if (typeof newLeft === "function") {
        value = newLeft(origin);
      } else {
        value = newLeft;
      }
      const alignedLeft = keepInHorizontalRange(value);
      const containerElement = containerRef();
      if (containerElement) {
        containerElement.scrollLeft = alignedLeft;
      }
      return alignedLeft;
    });
  }

  // ======================== 滚轮事件 ========================

  const onWheelDelta = (offsetXY: number, fromHorizontal: boolean) => {
    if (fromHorizontal) {
      syncScrollLeft((left) => left + (isRTL() ? -offsetXY : offsetXY));
    } else {
      syncScrollTop((top) => top + offsetXY);
    }
  };

  const [onRawWheel, onFireFoxScroll] = useFrameWheel(
    inVirtual,
    isScrollAtTop,
    isScrollAtBottom,
    isScrollAtLeft,
    isScrollAtRight,
    () => !!scrollWidth?.(),
    onWheelDelta,
    scrollMoving,
  );

  // ======================== 移动端触摸 ========================

  useMobileTouchMove(
    inVirtual,
    containerRef,
    (isHorizontal, delta, smoothOffset) => {
      if (isHorizontal) {
        syncScrollLeft((left) => left + (isRTL() ? -delta : delta));
        return true;
      } else {
        const newTop = offsetTop() + delta;
        const inRange = newTop >= 0 && newTop <= maxScrollHeight();
        if (inRange) {
          syncScrollTop(newTop);
        }
        return inRange;
      }
    },
    scrollMoving,
  );

  // ======================== 拖拽滚动 ========================

  useScrollDrag(
    inVirtual,
    containerRef,
    (offset) => {
      syncScrollTop((top) => top + offset);
    },
    scrollMoving,
  );

  // ======================== 滚动事件处理 ========================

  // 上次可见范围，用于检测变化
  let lastVisibleStart = -1;
  let lastVisibleEnd = -1;

  /**
   * 处理滚动事件。
   *
   * 内部状态更新通过 `createTaskQueue({ schedule: 'animationFrame', strategy: 'latest' })`
   * 调度到 rAF 回调中执行，确保同一帧内的多次滚动事件只触发一次状态更新和重渲染。
   * `onScroll` 用户回调保持同步触发，以符合用户对 scroll 事件的预期。
   */
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;

    // 用户回调保持同步
    const info: ScrollInfo = {
      x: isRTL() ? -target.scrollLeft : target.scrollLeft,
      y: target.scrollTop,
    };
    onScroll?.(info);

    // 内部状态更新在 rAF 调度，latest 策略只保留最后一次
    scrollQueue.submit(() => {
      const el = containerRef();
      if (!el) return;

      batch(() => {
        setOffsetTop(el.scrollTop);
        setOffsetLeft(el.scrollLeft);
      });

      // 虚拟滚动处理回调
      if (inVirtual()) {
        triggerVirtualScroll();
      }

      // 检测可见项目变化
      const [startIndex, endIndex] = visibleRange();
      if (startIndex !== lastVisibleStart || endIndex !== lastVisibleEnd) {
        lastVisibleStart = startIndex;
        lastVisibleEnd = endIndex;

        if (onVisibleChange) {
          const visibleList = items().slice(startIndex, endIndex + 1);
          onVisibleChange(visibleList, items());
        }
      }
    });
  };

  // ======================== 滚轮事件 ========================

  /**
   * 处理滚轮事件
   */
  const handleWheel = (e: WheelEvent) => {
    onRawWheel(e);
    // Firefox 检测鼠标滚轮 vs 触摸板
    onFireFoxScroll(e as unknown as FireFoxDOMMouseScrollEvent);
  };

  // ======================== 容器 Props ========================
  const containerStyle = createMemo(() => ({
    overflow: inVirtual() ? "hidden" : "auto",
    height: `${height()}px`,
  }));

  const containerProps = {
    ref: containerRef,
    style: containerStyle,
  };

  useEventListener(containerRef, "wheel", handleWheel);
  useEventListener(containerRef, "scroll", handleScroll);
  // ======================== scrollTo ========================

  /**
   * 滚动到指定位置
   * - 传数字：滚动到垂直偏移量（像素）
   * - 传 `{ index, align?, offset?, left? }`：滚动到指定索引，可选对齐方式、附加偏移和水平偏移
   * - 传 `{ key, align?, offset?, left? }`：滚动到指定 itemKey，可选对齐方式、附加偏移和水平偏移
   */
  const scrollTo = (arg: ScrollToArg) => {
    if (typeof arg === "number") {
      syncScrollTop(Math.max(0, arg));
      return;
    }

    if (arg.left !== undefined) {
      syncScrollLeft(arg.left);
    }

    if (arg.index !== undefined || arg.key !== undefined) {
      scrollToHook({
        index: arg.index,
        key: arg.key,
        align: arg.align,
        offset: arg.offset,
      });
    }
  };

  // ======================== 起始偏移量 ========================

  /**
   * 可见区域起始偏移量（translateY 值）
   * 用户在渲染项目时，可以用此值设置容器的 transform: translateY()
   * 来将可见项目定位到正确位置。
   */
  const startOffset = createMemo(() => {
    const items = visibleItems();
    return items.length > 0 ? items[0].offsetTop : 0;
  });

  // ======================== 返回值 ========================

  return {
    containerProps,

    visibleItems,
    visibleRange,
    stableItems,
    startOffset,
    measureItem,
    scrollTo,
    getScrollInfo,
    getItemSize,
    totalHeight,
    isVirtual: inVirtual,
    scrollTop: offsetTop,
  } as const;
}
