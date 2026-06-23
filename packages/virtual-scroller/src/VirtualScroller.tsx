import { createEffect, For, Show, type JSX } from "solid-js";
import type { ItemKey, ScrollInfo, ScrollToArg, VisibleItem } from "./types";
import { useVirtualScroll } from "./useVirtualScroll";

/**
 * VirtualScroller 组件实例方法
 */
export interface VirtualScrollerRef {
  /** 原生滚动容器元素 */
  readonly nativeElement: HTMLDivElement | undefined;
  /** 获取当前滚动位置 */
  getScrollInfo: () => ScrollInfo;
  /** 滚动到指定位置 */
  scrollTo: (arg: ScrollToArg) => void;
}

/**
 * extraRender 渲染信息
 */
export interface VirtualScrollerExtraRenderInfo {
  /** 当前渲染起始索引 */
  start: number;
  /** 当前渲染结束索引 */
  end: number;
  /** 是否处于虚拟滚动模式 */
  virtual: boolean;
  /** 当前水平滚动偏移 */
  offsetX: number;
  /** 当前垂直滚动偏移 */
  scrollTop: number;
  /** 当前渲染内容的垂直起始偏移 */
  offsetY: number;
  /** 是否 RTL */
  rtl: boolean;
  /** 获取指定索引项目尺寸 */
  getSize: ReturnType<typeof useVirtualScroll>["getItemSize"];
}

/**
 * VirtualScroller 组件选项
 */
export interface VirtualScrollerProps<T> {
  /** 数据列表 */
  items: T[];
  /** 项目的稳定身份，用于高度缓存、锚点恢复和排序/插入后的缓存复用 */
  itemKey?: ItemKey<T>;
  /** 容器高度（像素） */
  height: number;
  /** 估算的项目高度（像素） */
  estimatedItemHeight: number;
  /** overscan 数量 */
  overscan?: number;
  /** 滚动方向 */
  direction?: "ltr" | "rtl";
  /** 水平滚动宽度 */
  scrollWidth?: number;
  /** 是否启用虚拟滚动 */
  virtual?: boolean;
  /** 是否使用全高 */
  fullHeight?: boolean;
  /** 组件实例方法 */
  ref?: (api: VirtualScrollerRef) => void;
  /** 传给内部内容容器的属性 */
  innerProps?: JSX.HTMLAttributes<HTMLDivElement>;
  /** 在内部内容容器中额外渲染内容 */
  extraRender?: (info: VirtualScrollerExtraRenderInfo) => JSX.Element;
  /** 滚动事件回调 */
  onScroll?: (info: ScrollInfo) => void;
  /** 虚拟滚动处理回调 */
  onVirtualScroll?: (info: ScrollInfo) => void;
  /** 可见项目变化回调 */
  onVisibleChange?: (visibleList: T[], fullList: T[]) => void;
  /** 自定义样式 */
  style?: JSX.CSSProperties;
  /** CSS 类名 */
  class?: string;
  /** 渲染函数：接收项目数据和索引，返回 JSX */
  children: (item: T, index: number) => JSX.Element;
}

/**
 * VirtualScroller 组件
 *
 * 顶级虚拟滚动组件，封装完整的虚拟滚动逻辑：
 * - 自动管理滚动容器
 * - DOM 节点池化（稳定 slot 数量，滚动时不增删 DOM）
 * - 自动高度测量
 * - 支持动态高度
 *
 * @example
 * ```tsx
 * <VirtualScroller
 *   items={items()}
 *   height={500}
 *   estimatedItemHeight={50}
 * >
 *   {(item) => <div>{item.text}</div>}
 * </VirtualScroller>
 * ```
 */
export function VirtualScroller<T>(
  props: VirtualScrollerProps<T>,
): JSX.Element {
  let containerElement: HTMLDivElement | undefined;

  const scroll = useVirtualScroll({
    items: () => props.items,
    itemKey: props.itemKey,
    height: () => props.height,
    estimatedItemHeight: () => props.estimatedItemHeight,
    overscan: props.overscan,
    direction: props.direction ? (() => props.direction!) : undefined,
    scrollWidth: props.scrollWidth ? (() => props.scrollWidth) : undefined,
    virtual: props.virtual != null ? (() => props.virtual!) : undefined,
    fullHeight:
      props.fullHeight != null ? (() => props.fullHeight!) : undefined,
    onScroll: props.onScroll,
    onVirtualScroll: props.onVirtualScroll,
    onVisibleChange: props.onVisibleChange,
  });

  const api: VirtualScrollerRef = {
    get nativeElement() {
      return containerElement;
    },
    getScrollInfo: scroll.getScrollInfo,
    scrollTo: scroll.scrollTo,
  };

  createEffect(() => {
    props.ref?.(api);
  });

  const setContainerRef = (element: HTMLDivElement) => {
    containerElement = element;
    scroll.containerProps().ref(element);
  };

  const renderItem = (item: VisibleItem<T>) => {
    return (
      <div
        ref={(element) => scroll.measureItem(item.index, element)}
        style={{
          position: "absolute",
          top: `${item.offsetTop}px`,
          height: `${item.height}px`,
        }}
      >
        {props.children(item.data, item.index)}
      </div>
    );
  };

  const getExtraRenderInfo = (): VirtualScrollerExtraRenderInfo => {
    const range = scroll.visibleRange();
    const scrollInfo = scroll.getScrollInfo();

    return {
      start: range.startIndex,
      end: range.endIndex,
      virtual: scroll.isVirtual(),
      offsetX: scrollInfo.x,
      scrollTop: scrollInfo.y,
      offsetY: scroll.startOffset(),
      rtl: props.direction === "rtl",
      getSize: scroll.getItemSize,
    };
  };

  return (
    <div
      ref={setContainerRef}
      style={{ ...scroll.containerProps().style, ...props.style }}
      class={props.class}
      onScroll={scroll.containerProps().onScroll}
      onWheel={scroll.containerProps().onWheel}
    >
      <div
        {...(props.innerProps ?? {})}
        style={{
          ...props.innerProps?.style,
          height: `${scroll.totalHeight()}px`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Show
          when={scroll.isVirtual()}
          fallback={
            <For each={scroll.visibleItems()}>
              {(item) => renderItem(item)}
            </For>
          }
        >
          <For each={scroll.stableItemSlots()}>
            {(slot) => {
              let el: HTMLDivElement | undefined;

              createEffect(() => {
                const item = slot();
                if (item && el) {
                  scroll.measureItem(item.index, el);
                }
              });

              return (
                <Show when={slot()}>
                  {(item) => (
                    <div
                      ref={(element) => {
                        el = element;
                        scroll.measureItem(item().index, element);
                      }}
                      style={{
                        position: "absolute",
                        top: `${item().offsetTop}px`,
                        height: `${item().height}px`,
                      }}
                    >
                      {props.children(item().data, item().index)}
                    </div>
                  )}
                </Show>
              );
            }}
          </For>
        </Show>
        {props.extraRender?.(getExtraRenderInfo())}
      </div>
    </div>
  );
}
