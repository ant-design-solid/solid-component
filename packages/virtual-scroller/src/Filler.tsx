import { createResizeObserver } from "@solid-primitive/resize-observer";
import type { JSX } from "solid-js";

/**
 * Filler 组件 — 虚拟滚动内容容器
 *
 * 可选语法糖组件，自动设置：
 * - 外层 div：position relative + totalHeight 高度（提供完整滚动高度）
 * - 内层 div：translateY(startOffset) 定位可见项
 * - 可选的 onInnerResize：监听内层容器尺寸变化（用于高度变化后自动重测）
 * - 可选的 offsetX：支持水平滚动偏移（RTL 下自动使用 marginRight）
 * - 可选的 rtl：RTL 布局模式
 *
 * 使用示例：
 * ```tsx
 * <Filler totalHeight={scroll.totalHeight()} startOffset={scroll.startOffset()}>
 *   <For each={scroll.visibleItems()}>
 *     {(item) => <div ref={el => scroll.measureItem(item.index, el)}>...</div>}
 *   </For>
 * </Filler>
 * ```
 */
export interface FillerProps {
  /** 内容总高度（来自 useVirtualScroll 的 totalHeight） */
  totalHeight: number;
  /** 可见区域垂直偏移量（来自 useVirtualScroll 的 startOffset） */
  startOffset: number;
  /** 可选的横向偏移量（水平滚动时使用） */
  offsetX?: number;
  /** 是否 RTL 布局（true 时 offsetX 使用 marginRight 而非 marginLeft） */
  rtl?: boolean;
  /**
   * 可选的 inner resize 回调。
   * 监听内层内容容器的尺寸变化（如项目高度变化），
   * 触发后外部可调用 measureItem 重新测量。
   */
  onInnerResize?: () => void;
  /** 可选的自定义样式 */
  style?: JSX.CSSProperties;
  /** 可选的 CSS 类名 */
  class?: string;
  /** 子元素 */
  children: JSX.Element;
}

/**
 * Filler 组件
 *
 * 提供虚拟滚动所需的填充布局：
 * 1. 外层固定高度（模拟总滚动高度）
 * 2. 内层 translateY 偏移（定位可见项目到正确位置）
 * 3. 可选的 ResizeObserver 监听内层内容变化
 */
export function Filler(props: FillerProps) {
  let innerRef: HTMLDivElement | undefined;

  // 可选的内层容器 resize 检测
  // 只有 onInnerResize 存在时才观察 innerRef
  createResizeObserver(
    () => (props.onInnerResize ? innerRef : undefined),
    () => {
      props.onInnerResize?.();
    },
  );

  return (
    <div
      style={{
        height: `${props.totalHeight}px`,
        position: "relative",
        overflow: "hidden",
        ...props.style,
      }}
      class={props.class}
    >
      <div
        ref={innerRef}
        style={{
          transform: `translateY(${props.startOffset}px)`,
          ...(props.offsetX ? { [props.rtl ? 'marginRight' : 'marginLeft']: `${-props.offsetX}px` } : {}),
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
