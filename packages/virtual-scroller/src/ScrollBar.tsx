import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import type { ScrollBarProps } from "./types";

/**
 * 获取鼠标/触摸事件的页面坐标
 */
function getPageXY(e: MouseEvent | TouchEvent, horizontal: boolean): number {
  const obj = "touches" in e ? e.touches[0] : e;
  return obj[horizontal ? "pageX" : "pageY"] - window[horizontal ? "scrollX" : "scrollY"];
}

/**
 * 计算滑块大小
 * 根据容器尺寸和滚动范围计算滑块的大小比例
 */
function getSpinSize(containerSize: number, scrollRange: number): number {
  if (scrollRange <= 0 || containerSize <= 0) return 0;
  const ratio = containerSize / scrollRange;
  return Math.max(20, Math.floor(ratio * containerSize));
}

/**
 * ScrollBar - 自定义滚动条组件
 *
 * 主要功能：
 * 1. 根据滚动位置和范围显示滑块
 * 2. 支持拖拽滑块进行滚动
 * 3. 支持点击轨道快速滚动
 * 4. 自动隐藏（可选）
 * 5. 支持 RTL 布局
 * 6. 支持水平和垂直方向
 */
export function ScrollBar(props: ScrollBarProps) {
  const {
    scrollOffset,
    scrollRange,
    containerSize,
    horizontal = false,
    onScroll,
    onStartMove,
    onStopMove,
    rtl = false,
    style,
    thumbStyle: propsThumbStyle,
    show = "optional",
  } = props;

  // 拖拽状态
  const [dragging, setDragging] = createSignal(false);
  const [pageXY, setPageXY] = createSignal<number | null>(null);
  const [startTop, setStartTop] = createSignal<number | null>(null);

  // 可见性状态
  const [visible, setVisible] = createSignal(show === true);
  let visibleTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  // DOM 引用
  let scrollbarRef: HTMLDivElement | undefined;
  let thumbRef: HTMLDivElement | undefined;

  const isLTR = !rtl;

  // 计算滑块大小
  const spinSize = createMemo(() => getSpinSize(containerSize, scrollRange));

  // 计算可滚动范围
  const enableScrollRange = createMemo(() => scrollRange - containerSize || 0);
  const enableOffsetRange = createMemo(() => containerSize - spinSize() || 0);

  // 计算滑块位置
  const top = createMemo(() => {
    if (scrollOffset === 0 || enableScrollRange() === 0) {
      return 0;
    }
    const ptg = scrollOffset / enableScrollRange();
    return ptg * enableOffsetRange();
  });

  /**
   * 延迟隐藏滚动条
   */
  const delayHidden = () => {
    if (show === true || show === false) return;
    if (visibleTimeoutRef) {
      clearTimeout(visibleTimeoutRef);
    }
    setVisible(true);
    visibleTimeoutRef = setTimeout(() => {
      setVisible(false);
    }, 3000);
  };

  /**
   * 容器鼠标按下处理（阻止冒泡）
   */
  const onContainerMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  /**
   * 滑块鼠标按下处理
   */
  const onThumbMouseDown = (e: MouseEvent | TouchEvent) => {
    setDragging(true);
    setPageXY(getPageXY(e, horizontal));
    setStartTop(top());

    onStartMove?.();
    e.stopPropagation();
    e.preventDefault();
  };

  // 处理拖拽移动
  onMount(() => {
    // 触摸事件需要直接绑定到 DOM
    const onScrollbarTouchStart = (e: TouchEvent) => {
      e.preventDefault();
    };

    if (scrollbarRef) {
      scrollbarRef.addEventListener("touchstart", onScrollbarTouchStart, { passive: false });
    }
    if (thumbRef) {
      thumbRef.addEventListener("touchstart", onThumbMouseDown as (e: Event) => void, { passive: false });
    }

    onCleanup(() => {
      scrollbarRef?.removeEventListener("touchstart", onScrollbarTouchStart);
      thumbRef?.removeEventListener("touchstart", onThumbMouseDown as (e: Event) => void);
    });
  });

  // 处理拖拽移动和释放
  let moveRafId: number | null = null;

  onMount(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging() || !scrollbarRef) return;

      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
      }

      const rect = scrollbarRef.getBoundingClientRect();
      const scale = containerSize / (horizontal ? rect.width : rect.height);

      const currentStartTop = startTop();
      if (currentStartTop === null) return;

      const offset = (getPageXY(e, horizontal) - pageXY()!) * scale;
      let newTop = isLTR || !horizontal ? currentStartTop + offset : currentStartTop - offset;

      const tmpEnableScrollRange = enableScrollRange();
      const tmpEnableOffsetRange = enableOffsetRange();

      const ptg = tmpEnableOffsetRange ? newTop / tmpEnableOffsetRange : 0;
      let newScrollTop = Math.ceil(ptg * tmpEnableScrollRange);
      newScrollTop = Math.max(newScrollTop, 0);
      newScrollTop = Math.min(newScrollTop, tmpEnableScrollRange);

      moveRafId = requestAnimationFrame(() => {
        onScroll(newScrollTop);
      });
    };

    const onMouseUp = () => {
      setDragging(false);
      onStopMove?.();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    window.addEventListener("touchend", onMouseUp, { passive: true });

    onCleanup(() => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onMouseUp);
      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
      }
    });
  });

  // 滚动时显示滚动条
  onMount(() => {
    delayHidden();
    onCleanup(() => {
      if (visibleTimeoutRef) {
        clearTimeout(visibleTimeoutRef);
      }
    });
  });

  // 容器样式
  const containerStyle = createMemo<JSX.CSSProperties>(() => ({
    position: "absolute",
    visibility: visible() ? undefined : "hidden",
    ...(horizontal
      ? { height: "8px", left: 0, right: 0, bottom: 0 }
      : { width: "8px", top: 0, bottom: 0, [isLTR ? "right" : "left"]: 0 }),
    ...style,
  }));

  // 滑块样式
  const thumbStyleComputed = createMemo<JSX.CSSProperties>(() => ({
    position: "absolute",
    borderRadius: "99px",
    background: "var(--virtual-scroller-scrollbar-bg, rgba(0, 0, 0, 0.5))",
    cursor: "pointer",
    userSelect: "none",
    ...(horizontal
      ? { height: "100%", width: `${spinSize()}px`, [isLTR ? "left" : "right"]: `${top()}px` }
      : { width: "100%", height: `${spinSize()}px`, top: `${top()}px` }),
    ...propsThumbStyle,
  }));

  return (
    <div
      ref={scrollbarRef}
      style={containerStyle()}
      onMouseDown={onContainerMouseDown}
      onMouseMove={delayHidden}
    >
      <div
        ref={thumbRef}
        style={thumbStyleComputed()}
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
}
