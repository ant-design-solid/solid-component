import { createSignal, onCleanup } from "solid-js";

/**
 * useOriginScroll - 判断是否应该使用原生滚动行为
 *
 * 当滚动到边缘时，应该让浏览器处理原生滚动（如页面滚动），
 * 而不是在虚拟滚动容器内继续滚动。
 *
 * @param isScrollAtTop - 是否滚动到顶部
 * @param isScrollAtBottom - 是否滚动到底部
 * @param isScrollAtLeft - 是否滚动到左侧
 * @param isScrollAtRight - 是否滚动到右侧
 * @returns 判断函数，返回 true 表示应该使用原生滚动
 */
export function useOriginScroll(
  isScrollAtTop: () => boolean,
  isScrollAtBottom: () => boolean,
  isScrollAtLeft: () => boolean,
  isScrollAtRight: () => boolean,
) {
  // 滚动锁定，防止在边缘时继续触发虚拟滚动
  const [lockRef, setLockRef] = createSignal(false);
  let lockTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  function lockScroll() {
    if (lockTimeoutRef) {
      clearTimeout(lockTimeoutRef);
    }
    setLockRef(true);
    lockTimeoutRef = setTimeout(() => {
      setLockRef(false);
    }, 50);
  }

  onCleanup(() => {
    if (lockTimeoutRef) {
      clearTimeout(lockTimeoutRef);
    }
  });

  /**
   * 判断是否应该使用原生滚动
   * @param isHorizontal - 是否水平滚动
   * @param delta - 滚动偏移量
   * @param smoothOffset - 是否是平滑偏移（来自触摸移动）
   * @returns true 表示应该使用原生滚动
   */
  return (isHorizontal: boolean, delta: number, smoothOffset = false): boolean => {
    // 判断是否在边缘且继续向边缘方向滚动
    const originScroll = isHorizontal
      ? // 水平方向：向左滚动到左边缘，或向右滚动到右边缘
        (delta < 0 && isScrollAtLeft()) ||
        (delta > 0 && isScrollAtRight())
      : // 垂直方向：向上滚动到顶部，或向下滚动到底部
        (delta < 0 && isScrollAtTop()) ||
        (delta > 0 && isScrollAtBottom());

    if (smoothOffset && originScroll) {
      // 平滑偏移时（触摸移动），不需要锁定
      if (lockTimeoutRef) {
        clearTimeout(lockTimeoutRef);
      }
      setLockRef(false);
    } else if (!originScroll || lockRef()) {
      // 不在边缘或已锁定时，锁定滚动
      lockScroll();
    }

    // 返回 true 表示应该使用原生滚动
    return !lockRef() && originScroll;
  };
}
