import { createEffect } from "solid-js";
import type { UseInfiniteScrollOptions } from "./types";

/**
 * useInfiniteScroll - 无限滚动 Hook
 *
 * 监听滚动位置，在接近底部时触发 onLoadMore 回调。
 * 与 useVirtualScroll 组合使用。
 *
 * @param options - 无限滚动配置
 * @param scrollState - 滚动状态（可用 useVirtualScroll 返回值 + height 选项组成）
 *
 * @example
 * ```tsx
 * const [containerHeight] = createSignal(500);
 *
 * const vs = useVirtualScroll({
 *   items: () => items(),
 *   height: containerHeight,
 *   estimatedItemHeight: () => 50,
 * });
 *
 * useInfiniteScroll(
 *   {
 *     hasMore: () => hasMore(),
 *     onLoadMore: loadMore,
 *     loading: () => loading(),
 *     threshold: 200,
 *   },
 *   {
 *     totalHeight: vs.totalHeight,
 *     scrollTop: vs.scrollTop,
 *     containerHeight, // 复用传入 useVirtualScroll 的 height 值
 *   },
 * );
 * ```
 */
export function useInfiniteScroll(
  options: UseInfiniteScrollOptions,
  scrollState: {
    /** 内容总高度 */
    totalHeight: () => number;
    /** 当前垂直滚动位置 */
    scrollTop: () => number;
    /** 容器可视高度 */
    containerHeight: () => number;
  },
): void {
  const { hasMore, onLoadMore, threshold = 200 } = options;

  createEffect(() => {
    const totalH = scrollState.totalHeight();
    const containerH = scrollState.containerHeight();
    const scrollT = scrollState.scrollTop();
    const more = hasMore();
    const isLoading = options.loading?.() ?? false;

    // 没有更多数据或正在加载中，跳过
    if (!more || isLoading) return;

    // 检测是否接近底部
    const scrollBottom = scrollT + containerH;
    if (scrollBottom >= totalH - threshold) {
      onLoadMore();
    }
  });
}
