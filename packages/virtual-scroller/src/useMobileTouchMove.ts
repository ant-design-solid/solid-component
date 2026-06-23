import { onCleanup, onMount } from "solid-js";

/**
 * 平滑滚动衰减系数
 */
const SMOOTH_PTG = 14 / 15;

/**
 * useMobileTouchMove - 移动端触摸滚动支持
 *
 * 主要功能：
 * 1. 监听触摸事件，支持触摸滚动
 * 2. 检测滚动方向（水平/垂直）
 * 3. 平滑滚动衰减效果
 * 4. 防止嵌套列表重复处理
 *
 * @param inVirtual - 是否启用虚拟滚动
 * @param listRef - 列表容器元素引用
 * @param callback - 滚动回调，返回 true 表示已处理并阻止默认行为
 */
export function useMobileTouchMove(
  inVirtual: () => boolean,
  listRef: () => HTMLElement | undefined,
  callback: (
    isHorizontal: boolean,
    offset: number,
    smoothOffset: boolean,
    e?: TouchEvent,
  ) => boolean,
  scrollMoving?: () => boolean,
) {
  let touchedRef = false;
  let touchXRef = 0;
  let touchYRef = 0;
  let elementRef: HTMLElement | null = null;
  let intervalRef: ReturnType<typeof setInterval> | null = null;

  /**
   * 清理事件监听
   */
  const cleanUpEvents = () => {
    if (elementRef) {
      elementRef.removeEventListener("touchmove", onTouchMove);
      elementRef.removeEventListener("touchend", onTouchEnd);
      elementRef = null;
    }
  };

  /**
   * 触摸移动处理
   */
  const onTouchMove = (e: TouchEvent) => {
    if (touchedRef) {
      const currentX = Math.ceil(e.touches[0].pageX);
      const currentY = Math.ceil(e.touches[0].pageY);
      let offsetX = touchXRef - currentX;
      let offsetY = touchYRef - currentY;

      // 检测滚动方向
      const isHorizontal = Math.abs(offsetX) > Math.abs(offsetY);
      if (isHorizontal) {
        touchXRef = currentX;
      } else {
        touchYRef = currentY;
      }

      // 调用回调
      const scrollHandled = callback(isHorizontal, isHorizontal ? offsetX : offsetY, false, e);
      if (scrollHandled) {
        e.preventDefault();
      }

      // 清理之前的平滑滚动
      if (intervalRef) {
        clearInterval(intervalRef);
      }

      // 启动平滑滚动衰减
      if (scrollHandled) {
        intervalRef = setInterval(() => {
          if (isHorizontal) {
            offsetX *= SMOOTH_PTG;
          } else {
            offsetY *= SMOOTH_PTG;
          }
          const offset = Math.floor(isHorizontal ? offsetX : offsetY);
          if (!callback(isHorizontal, offset, true) || Math.abs(offset) <= 0.1) {
            if (intervalRef) {
              clearInterval(intervalRef);
              intervalRef = null;
            }
          }
        }, 16);
      }
    }
  };

  /**
   * 触摸结束处理
   */
  const onTouchEnd = () => {
    touchedRef = false;
    cleanUpEvents();
  };

  /**
   * 触摸开始处理
   */
  const onTouchStart = (e: TouchEvent) => {
    cleanUpEvents();

    if (scrollMoving?.()) {
      touchedRef = false;
      return;
    }
    if (e.touches.length === 1 && !touchedRef) {
      touchedRef = true;
      touchXRef = Math.ceil(e.touches[0].pageX);
      touchYRef = Math.ceil(e.touches[0].pageY);

      elementRef = e.target as HTMLElement;
      elementRef.addEventListener("touchmove", onTouchMove, { passive: false });
      elementRef.addEventListener("touchend", onTouchEnd, { passive: true });
    }
  };

  // 注册事件监听
  onMount(() => {
    const element = listRef();
    if (inVirtual() && element) {
      element.addEventListener("touchstart", onTouchStart, { passive: true });
    }

    onCleanup(() => {
      const el = listRef();
      el?.removeEventListener("touchstart", onTouchStart);
      cleanUpEvents();
      if (intervalRef) {
        clearInterval(intervalRef);
      }
    });
  });
}
