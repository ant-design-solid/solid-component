import {
  type Accessor,
  batch,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import type { ItemKey, VirtualItemKey } from "./types";

/**
 * useHeights 选项
 */
export interface UseHeightsOptions<T> {
  /** 数据列表（用于 WeakMap 引用追踪） */
  items: Accessor<T[]>;
  /** 项目的稳定身份，用于排序、插入后复用高度缓存 */
  itemKey?: ItemKey<T>;
  /** 估算的项目高度（用于未测量项目） */
  estimatedItemHeight: Accessor<number>;
  /** 高度变化回调 */
  onHeightChange?: (index: number, height: number) => void;
}

interface PendingMeasurement {
  index: number;
  height: number;
  marginTop: number;
  marginBottom: number;
}

class HeightCache<T> {
  // 首次测量的索引记录（用于高度同步）
  private readonly changedIndices = new Set<number>();
  private track: VoidFunction;
  private dirty: VoidFunction;
  // 显式 key 缓存：用于排序、prepend、对象重建后的高度复用
  private readonly keyCache = new Map<VirtualItemKey, number>();
  // 对象引用缓存：无 itemKey 时，比按索引缓存更不容易错位
  private readonly weakCache = new WeakMap<object, number>();
  // 回退缓存：Map — 以索引为键，处理原始类型数据
  private readonly indexCache = new Map<number, number>();

  constructor(private readonly itemKey?: ItemKey<T>) {
    const [value, setValue] = createSignal(undefined, { equals: false });
    this.track = value;
    this.dirty = setValue;
  }

  getChangedIndices() {
    this.track();
    return this.changedIndices;
  }

  resetChangedIndices() {
    this.changedIndices.clear();
  }

  /**
   * 解析用户提供的 itemKey。
   *
   * itemKey 是缓存身份，必须稳定且当前列表内唯一；解析不到合法 key
   * 时直接抛错，避免静默退回 index 后出现隐蔽的高度错位。
   */
  getItemKey(item: unknown, index: number): VirtualItemKey | undefined {
    if (this.itemKey === undefined) return undefined;

    const key =
      typeof this.itemKey === "function"
        ? this.itemKey(item as T, index)
        : (item as any)?.[this.itemKey];

    if (typeof key !== "string" && typeof key !== "number") {
      throw new Error(
        "virtual-scroller: itemKey must resolve to a string or number.",
      );
    }

    return key;
  }

  get(item: unknown, index: number): number | undefined {
    const key = this.getItemKey(item, index);
    if (key !== undefined) {
      return this.keyCache.get(key);
    }

    if (typeof item === "object" && item !== null) {
      const cached = this.weakCache.get(item);
      if (cached !== undefined) return cached;
    }

    return this.indexCache.get(index);
  }

  set(item: unknown, index: number, height: number): boolean {
    const key = this.getItemKey(item, index);
    const prev = untrack(() => this.get(item, index));

    if (prev === height) return false;

    if (prev === undefined) {
      this.changedIndices.add(index);
    }

    if (key !== undefined) {
      this.keyCache.set(key, height);
    } else if (typeof item === "object" && item !== null) {
      this.weakCache.set(item, height);
    } else {
      this.indexCache.set(index, height);
    }
    this.dirty();
    return true;
  }
}

/**
 * 高度测量和缓存 Hook
 *
 * 测量项目高度并通过 ResizeObserver 持续监听高度变化。
 *
 * 核心策略：
 * - 高度缓存按 itemKey、对象引用、索引依次兜底。
 * - 测量队列在同一微任务内先批量 DOM read，再批量写缓存和 signal。
 * - 每个 useHeights 实例共享一个 ResizeObserver，避免每个 item 单独创建 observer。
 *
 * @param options - 配置选项
 * @returns 高度测量相关的方法和状态
 */
export function useHeights<T>(options: UseHeightsOptions<T>) {
  const { items, itemKey, onHeightChange } = options;

  const heightCache = new HeightCache(itemKey);

  // 元素 ↔ 索引映射（用于单例 observer 回调查找 + 元素回收检测）
  const elementToIndex = new Map<HTMLElement, number>();
  const indexToElement = new Map<number, HTMLElement>();

  const changedRecord = new Set<number>();
  // 内部高度版本号：让 getHeight/getItemHeight 在响应式上下文中感知缓存变化
  const [heightVersion, setHeightVersion] = createSignal(0);
  const pendingElements = new Set<HTMLElement>();
  const observedElements = new Set<HTMLElement>();
  let isMeasureFlushScheduled = false;
  let resizeObserver: ResizeObserver | undefined;

  /**
   * 读取单个元素尺寸。
   *
   * 这里只做 DOM read，缓存写入统一放到 flushMeasurements，避免多元素
   * 测量时读写交错导致浏览器反复计算布局。
   */
  function readMeasurement(
    element: HTMLElement,
  ): PendingMeasurement | undefined {
    const index = elementToIndex.get(element);
    if (index === undefined) return undefined;

    const height = element.offsetHeight;
    if (height <= 0) return undefined;

    const style = getComputedStyle(element);

    const top = parseFloat(style.marginTop) || 0;
    const bottom = parseFloat(style.marginBottom) || 0;

    return {
      index,
      height,
      marginTop: top,
      marginBottom: bottom,
    };
  }

  /**
   * 写入单个测量结果。
   *
   * 返回 true 表示高度缓存发生变化，需要触发 heightVersion。
   */
  function writeMeasurement(measurement: PendingMeasurement): void {
    const { index, height, marginTop, marginBottom } = measurement;
    const totalHeight = height + marginTop + marginBottom;
    const item = items()[index];

    const changed = heightCache.set(item, index, totalHeight);

    changed && onHeightChange?.(index, totalHeight);
  }

  function flushMeasurements() {
    isMeasureFlushScheduled = false;
    if (pendingElements.size === 0) return;

    pendingElements.clear();

    const measurements: PendingMeasurement[] = [];
    for (const element of pendingElements) {
      const measurement = readMeasurement(element);
      if (measurement !== undefined) {
        measurements.push(measurement);
      }
    }

    if (measurements.length === 0) return;

    batch(() => {
      for (const measurement of measurements) {
        writeMeasurement(measurement);
      }
    });
  }

  function enqueueMeasurement(element: HTMLElement) {
    pendingElements.add(element);
    if (isMeasureFlushScheduled) return;

    isMeasureFlushScheduled = true;
    queueMicrotask(flushMeasurements);
  }

  function getResizeObserver(): ResizeObserver {
    if (resizeObserver === undefined) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          enqueueMeasurement(entry.target as HTMLElement);
        }
      });
    }

    return resizeObserver;
  }

  function unobserveElement(element: HTMLElement) {
    if (observedElements.delete(element)) {
      resizeObserver?.unobserve(element);
    }
    pendingElements.delete(element);
  }

  function detachIndex(index: number) {
    const element = indexToElement.get(index);
    if (element === undefined) return;

    indexToElement.delete(index);
    if (elementToIndex.get(element) === index) {
      elementToIndex.delete(element);
      unobserveElement(element);
    }
  }

  function detachElement(element: HTMLElement) {
    const index = elementToIndex.get(element);
    if (index === undefined) return;

    elementToIndex.delete(element);
    if (indexToElement.get(index) === element) {
      indexToElement.delete(index);
    }
  }

  function ensureObserved(element: HTMLElement) {
    if (observedElements.has(element)) return;

    getResizeObserver().observe(element);
    observedElements.add(element);
  }

  function observeElement(index: number, element: HTMLElement) {
    if (elementToIndex.get(element) === index) return;

    const boundElement = indexToElement.get(index);
    if (boundElement !== undefined && boundElement !== element) {
      detachIndex(index);
    }

    const boundIndex = elementToIndex.get(element);
    if (boundIndex !== undefined && boundIndex !== index) {
      detachElement(element);
    }

    ensureObserved(element);
    elementToIndex.set(element, index);
    indexToElement.set(index, element);
  }

  /**
   * 测量单个项目高度。
   *
   * 步骤：
   *   1. 注册到当前实例的 ResizeObserver 持续监听
   *   2. 加入测量队列，在同一微任务内统一 DOM read/write
   */
  const measureItem = (index: number, element: HTMLElement) => {
    observeElement(index, element);
    enqueueMeasurement(element);
  };

  // 清理：取消本实例追踪的所有元素
  onCleanup(() => {
    resizeObserver?.disconnect();
    observedElements.clear();
    pendingElements.clear();
    elementToIndex.clear();
    indexToElement.clear();
  });

  return [heightCache, measureItem] as const;
}
