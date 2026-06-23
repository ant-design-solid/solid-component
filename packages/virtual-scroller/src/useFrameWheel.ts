import { createSignal, onCleanup } from "solid-js";
import { useOriginScroll } from "./useOriginScroll";

/**
 * Firefox DOMMouseScroll 事件类型
 */
export interface FireFoxDOMMouseScrollEvent {
  detail: number;
  preventDefault: VoidFunction;
}

/**
 * 检测是否是 Firefox 浏览器
 */
const isFirefox = typeof navigator !== "undefined" && /Firefox/i.test(navigator.userAgent);

/**
 * useFrameWheel - 使用 requestAnimationFrame 优化滚轮事件
 *
 * 主要功能：
 * 1. 使用 rAF 节流滚轮事件，避免过于频繁的更新
 * 2. 处理 Firefox 浏览器的兼容性问题
 * 3. 支持 Shift+滚轮 水平滚动
 * 4. 检测滚动方向（水平/垂直）
 * 5. 在边缘时允许原生滚动行为
 *
 * @param inVirtual - 是否启用虚拟滚动
 * @param isScrollAtTop - 是否滚动到顶部
 * @param isScrollAtBottom - 是否滚动到底部
 * @param isScrollAtLeft - 是否滚动到左侧
 * @param isScrollAtRight - 是否滚动到右侧
 * @param horizontalScroll - 是否启用水平滚动
 * @param onWheelDelta - 滚轮回调，返回 true 时阻止默认行为
 * @returns [onWheel, onFireFoxScroll] 事件处理器
 */
export function useFrameWheel(
  inVirtual: () => boolean,
  isScrollAtTop: () => boolean,
  isScrollAtBottom: () => boolean,
  isScrollAtLeft: () => boolean,
  isScrollAtRight: () => boolean,
  horizontalScroll: () => boolean,
  onWheelDelta: (offset: number, horizontal: boolean) => void,
  scrollMoving?: () => boolean,
): [(e: WheelEvent) => void, (e: FireFoxDOMMouseScrollEvent) => void] {
  // 累积的滚动偏移量
  let offsetRef = 0;
  let nextFrameRef: number | null = null;

  // Firefox 相关
  let wheelValueRef: number | null = null;
  let isMouseScrollRef = false;

  // 滚动方向检测
  let wheelDirectionRef: "x" | "y" | "sx" | null = null;
  let wheelDirectionCleanRef: number | null = null;

  // 原生滚动判断
  const originScroll = useOriginScroll(
    isScrollAtTop,
    isScrollAtBottom,
    isScrollAtLeft,
    isScrollAtRight,
  );

  // 清理 rAF
  onCleanup(() => {
    if (nextFrameRef !== null) {
      cancelAnimationFrame(nextFrameRef);
    }
    if (wheelDirectionCleanRef !== null) {
      cancelAnimationFrame(wheelDirectionCleanRef);
    }
  });

  /**
   * 处理垂直滚轮事件
   */
  function onWheelY(e: WheelEvent, deltaY: number) {
    if (nextFrameRef !== null) {
      cancelAnimationFrame(nextFrameRef);
    }

    // 在边缘时，让浏览器处理原生滚动
    if (originScroll(false, deltaY)) return;

    // 标记事件已处理，防止嵌套列表重复处理
    const event = e as WheelEvent & { _virtualHandled?: boolean };
    if (!event._virtualHandled) {
      event._virtualHandled = true;
    } else {
      return;
    }

    // 累积偏移量
    offsetRef += deltaY;
    wheelValueRef = deltaY;

    // 非 Firefox 时阻止默认行为
    if (!isFirefox) {
      e.preventDefault();
    }

    // 在下一帧处理滚动
    nextFrameRef = requestAnimationFrame(() => {
      // Firefox 鼠标滚轮需要乘以系数
      const patchMultiple = isMouseScrollRef ? 10 : 1;
      onWheelDelta(offsetRef * patchMultiple, false);
      offsetRef = 0;
    });
  }

  /**
   * 处理水平滚轮事件
   */
  function onWheelX(e: WheelEvent, deltaX: number) {
    onWheelDelta(deltaX, true);

    if (!isFirefox) {
      e.preventDefault();
    }
  }

  /**
   * 主滚轮事件处理器
   */
  function onWheel(e: WheelEvent) {
    if (!inVirtual()) return;
    if (scrollMoving?.()) return;

    // 清理方向检测定时器
    if (wheelDirectionCleanRef !== null) {
      cancelAnimationFrame(wheelDirectionCleanRef);
    }
    wheelDirectionCleanRef = requestAnimationFrame(() => {
      wheelDirectionRef = null;
    });

    const { deltaX, deltaY, shiftKey } = e;

    let mergedDeltaX = deltaX;
    let mergedDeltaY = deltaY;

    // 检测 Shift+滚轮（水平滚动）
    if (
      wheelDirectionRef === "sx" ||
      (!wheelDirectionRef && shiftKey && deltaY && !deltaX)
    ) {
      mergedDeltaX = deltaY;
      mergedDeltaY = 0;
      wheelDirectionRef = "sx";
    }

    const absX = Math.abs(mergedDeltaX);
    const absY = Math.abs(mergedDeltaY);

    // 检测滚动方向
    if (wheelDirectionRef === null) {
      wheelDirectionRef = horizontalScroll() && absX > absY ? "x" : "y";
    }

    // 根据方向处理
    if (wheelDirectionRef === "y") {
      onWheelY(e, mergedDeltaY);
    } else {
      onWheelX(e, mergedDeltaX);
    }
  }

  /**
   * Firefox DOMMouseScroll 事件处理器
   */
  function onFireFoxScroll(e: FireFoxDOMMouseScrollEvent) {
    if (!inVirtual()) return;
    // 检测是否是鼠标滚轮（而非触摸板）
    isMouseScrollRef = e.detail === wheelValueRef;
  }

  return [onWheel, onFireFoxScroll];
}
