import { makeEventListener } from "@solid-primitive/web";
import { Accessor, createEffect, onCleanup } from "solid-js";
import { TransformOffset } from "../utils";

function clampOffset(value: number) {
  return Math.max(0, Math.min(value, 100));
}

export default function createDragOffset(
  containerRef: Accessor<HTMLElement | undefined>,
  onChange: (offset: TransformOffset) => void,
  onChangeEnd: () => void,
  disabled: Accessor<boolean>,
) {
  let activePointerId: number | null = null;

  const updateOffset = (e: PointerEvent, container: HTMLElement) => {
    const { left, top, width, height } = container.getBoundingClientRect();
    if (width <= 0 || height <= 0) {
      return false;
    }

    // 直接基于 viewport 坐标与容器 rect 计算，避免滚动偏移带来的额外误差。
    const percentX = ((e.clientX - left) / width) * 100;
    const percentY = ((e.clientY - top) / height) * 100;

    const offsetX = clampOffset(percentX);
    const offsetY = clampOffset(percentY);

    const calcOffset = {
      x: offsetX,
      y: offsetY,
    };
    onChange(calcOffset);
    return true;
  };

  createEffect(() => {
    const container = containerRef();
    if (!container) return;

    const resetDragState = () => {
      // 拖拽结束或容器卸载时，仅释放当前容器上的 pointer capture，避免全局监听残留。
      if (activePointerId !== null && container.hasPointerCapture?.(activePointerId)) {
        container.releasePointerCapture(activePointerId);
      }
      activePointerId = null;
    };

    const onDragMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      updateOffset(e, container);
    };

    const onDragEnd = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      resetDragState();
      onChangeEnd();
    };

    const onDragCancel = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      resetDragState();
      onChangeEnd();
    };

    const onDragStart = (e: PointerEvent) => {
      resetDragState();

      if (disabled() || e.button !== 0 || !e.isPrimary) return;

      if (!updateOffset(e, container)) return;

      activePointerId = e.pointerId;
      // 使用容器自身的 pointer capture 接管后续事件，不再依赖 document 级监听。
      container.setPointerCapture?.(e.pointerId);
    };

    const cleanups = [
      makeEventListener(container, "pointerdown", onDragStart),
      makeEventListener(container, "pointermove", onDragMove),
      makeEventListener(container, "pointerup", onDragEnd),
      makeEventListener(container, "pointercancel", onDragCancel),
    ];

    onCleanup(() => {
      cleanups.forEach((cleanup) => cleanup());
      resetDragState();
    });
  });
}
