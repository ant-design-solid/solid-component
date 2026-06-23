import { onCleanup, onMount } from "solid-js";

/**
 * 平滑滚动偏移量计算
 * 使用平方根使滚动速度随距离增加而减慢
 */
function smoothScrollOffset(offset: number): number {
  return Math.floor(Math.sqrt(offset));
}

/**
 * 获取鼠标/触摸事件的页面坐标
 */
function getPageXY(
  e: MouseEvent | TouchEvent,
  horizontal: boolean,
): number {
  const obj = "touches" in e ? e.touches[0] : e;
  return obj[horizontal ? "pageX" : "pageY"] - window[horizontal ? "scrollX" : "scrollY"];
}

/**
 * useScrollDrag - 鼠标拖拽滚动支持
 *
 * 主要功能：
 * 1. 鼠标按下后拖拽超出容器区域时自动滚动
 * 2. 滚动速度随拖拽距离增加
 * 3. 使用 requestAnimationFrame 实现平滑滚动
 *
 * @param inVirtual - 是否启用虚拟滚动
 * @param componentRef - 容器元素引用
 * @param onScrollOffset - 滚动偏移量回调
 */
export function useScrollDrag(
  inVirtual: () => boolean,
  componentRef: () => HTMLElement | undefined,
  onScrollOffset: (offset: number) => void,
  scrollMoving?: () => boolean,
) {
  let mouseDownLock = false;
  let rafId: number | null = null;
  let offset = 0;

  /**
   * 停止滚动动画
   */
  const stopScroll = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  /**
   * 继续滚动动画
   */
  const continueScroll = () => {
    stopScroll();
    rafId = requestAnimationFrame(() => {
      onScrollOffset(offset);
      continueScroll();
    });
  };

  /**
   * 清理拖拽状态
   */
  const clearDragState = () => {
    mouseDownLock = false;
    stopScroll();
  };

  /**
   * 鼠标按下处理
   */
  const onMouseDown = (e: MouseEvent) => {
    // 跳过可拖拽元素或非左键点击
    if (scrollMoving?.()) return;
    if ((e.target as HTMLElement).draggable || e.button !== 0) {
      return;
    }

    // 标记事件已处理，防止嵌套列表重复处理
    const event = e as MouseEvent & { _virtualHandled?: boolean };
    if (!event._virtualHandled) {
      event._virtualHandled = true;
      mouseDownLock = true;
    }
  };

  /**
   * 鼠标移动处理
   */
  const onMouseMove = (e: MouseEvent) => {
    if (mouseDownLock) {
      const ele = componentRef();
      if (!ele) return;

      const mouseY = getPageXY(e, false);
      const { top, bottom } = ele.getBoundingClientRect();

      if (mouseY <= top) {
        // 鼠标在容器上方，向上滚动
        const diff = top - mouseY;
        offset = -smoothScrollOffset(diff);
        continueScroll();
      } else if (mouseY >= bottom) {
        // 鼠标在容器下方，向下滚动
        const diff = mouseY - bottom;
        offset = smoothScrollOffset(diff);
        continueScroll();
      } else {
        // 鼠标在容器内，停止滚动
        stopScroll();
      }
    }
  };

  // 注册事件监听
  onMount(() => {
    const ele = componentRef();
    if (inVirtual() && ele) {
      ele.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mouseup", clearDragState);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("dragend", clearDragState);
    }

    onCleanup(() => {
      const el = componentRef();
      el?.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", clearDragState);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("dragend", clearDragState);
      stopScroll();
    });
  });
}
