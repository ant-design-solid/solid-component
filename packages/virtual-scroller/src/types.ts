import type { Accessor, JSX } from "solid-js";

/**
 * 滚动对齐方式
 * - start: 滚动到顶部
 * - center: 滚动到中间
 * - end: 滚动到底部
 * - auto: 自动判断（如果已在可见区域内则不滚动）
 */
export type ScrollAlign = "start" | "center" | "end" | "auto";

/**
 * 滚动方向
 * - ltr: 从左到右
 * - rtl: 从右到左
 */
export type Direction = "ltr" | "rtl";

/**
 * 虚拟列表项目的稳定身份。
 *
 * 这个 key 只用于高度缓存、滚动锚点和滚动定位等虚拟列表内部逻辑，
 * 不参与 Solid 的 DOM diff。
 */
export type VirtualItemKey = string | number;

/**
 * 项目 key 解析器。
 * - 字符串/数字字段名：从 item 上读取对应字段
 * - 函数：由用户自行返回稳定的 string/number key
 */
export type ItemKey<T> =
  | Extract<keyof T, string | number>
  | ((item: T, index: number) => VirtualItemKey);

/**
 * 容器尺寸
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * 可见范围
 */
export type VisibleRange = [startIndex: number, endIndex: number]

/**
 * 可见项目
 */
export interface VisibleItem<T> {
  /** 项目索引 */
  index: number;
  /** 项目数据 */
  data: T;
  /** 项目高度（像素） */
  height: number;
  /** 项目顶部相对于容器顶部的偏移量（像素） */
  offsetTop: number;
}

/**
 * 滚动信息
 */
export interface ScrollInfo {
  /** 水平滚动偏移量 */
  x: number;
  /** 垂直滚动偏移量 */
  y: number;
}

/**
 * 容器 Props（用户需要绑定到滚动容器）
 */
export interface ContainerProps {
  ref: (el: HTMLElement) => void;
  style: {
    overflow: string;
    height: string;
  };
  onScroll: (e: Event) => void;
  onWheel: (e: WheelEvent) => void;
}

/**
 * useVirtualScroll 选项
 */
export interface UseVirtualScrollOptions<T> {
  /** 数据列表（响应式） */
  items: Accessor<T[]>;
  /** 项目的稳定身份，用于高度缓存、锚点恢复和排序/插入后的缓存复用 */
  itemKey?: ItemKey<T>;
  /** 容器高度（响应式） */
  height: Accessor<number>;
  /** 估算的项目高度（用于初始渲染和未测量项目） */
  estimatedItemHeight: Accessor<number>;
  /** overscan 数量（可见区域外预渲染的项目数） */
  overscan?: number;
  /** 滚动方向（默认 "ltr"） */
  direction?: Accessor<Direction>;
  /** 水平滚动宽度（设置后启用水平滚动） */
  scrollWidth?: Accessor<number>;
  scrollMoving?: Accessor<boolean>
  /** 是否启用虚拟滚动（默认 true，数据量小时可禁用） */
  virtual?: Accessor<boolean>;
  /** 高度变化回调 */
  onHeightChange?: (index: number, height: number) => void;
  /** 滚动事件回调 */
  onScroll?: (info: ScrollInfo) => void;
  /** 可见项目变化回调 */
  onVisibleChange?: (visibleList: T[], fullList: T[]) => void;
  /** 虚拟滚动处理回调（仅在虚拟滚动处理滚动事件时触发，与 onScroll 区分） */
  onVirtualScroll?: (info: ScrollInfo) => void;
  /** 是否使用全高（当内容高度小于容器高度时，总高度至少等于容器高度） */
  fullHeight?: Accessor<boolean>;
}

/** scrollTo offset 函数可读取的项目尺寸 */
export interface ScrollItemSize {
  /** 项目顶部偏移量 */
  top: number;
  /** 项目底部偏移量 */
  bottom: number;
  /** 项目高度 */
  height: number;
}

/** scrollTo offset 函数入参 */
export interface ScrollOffsetInfo {
  /** 当前滚动目标索引 */
  index: number;
  /** 获取指定索引项目尺寸；未传索引时返回当前目标项目尺寸 */
  getSize: (index?: number) => ScrollItemSize;
}

/** scrollTo 对齐后的附加偏移量 */
export type ScrollOffset =
  | number
  | ((info: ScrollOffsetInfo) => number);

/**
 * scrollTo 参数类型
 * - `number`: 滚动到指定的垂直偏移量（像素）
 * - `{ index, align?, offset?, left? }`: 滚动到指定索引，可选对齐方式、附加偏移和水平偏移
 * - `{ key, align?, offset?, left? }`: 滚动到指定 itemKey，可选对齐方式、附加偏移和水平偏移
 */
export type ScrollToArg =
  | number
  | {
      index?: number;
      key?: VirtualItemKey;
      align?: ScrollAlign;
      offset?: ScrollOffset;
      left?: number;
    };

/**
 * 滚动条 Props
 */
export interface ScrollBarProps {
  /** 滚动偏移量 */
  scrollOffset: number;
  /** 滚动范围（内容总高度/宽度） */
  scrollRange: number;
  /** 容器尺寸 */
  containerSize: number;
  /** 是否水平方向 */
  horizontal?: boolean;
  /** 滚动回调 */
  onScroll: (offset: number) => void;
  /** 开始拖拽回调 */
  onStartMove?: () => void;
  /** 结束拖拽回调 */
  onStopMove?: () => void;
  /** 是否 RTL */
  rtl?: boolean;
  /** 自定义样式 */
  style?: JSX.CSSProperties;
  /** 滑块样式 */
  thumbStyle?: JSX.CSSProperties;
  /** 是否显示滚动条 */
  show?: boolean | "optional";
}

/**
 * useInfiniteScroll 选项
 */
export interface UseInfiniteScrollOptions {
  /** 是否还有更多数据 */
  hasMore: Accessor<boolean>;
  /** 加载更多的回调 */
  onLoadMore: () => void;
  /** 加载状态 */
  loading?: Accessor<boolean>;
  /** 距离底部多远触发加载（像素） */
  threshold?: number;
}
