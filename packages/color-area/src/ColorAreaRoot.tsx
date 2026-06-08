import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  callHandler,
  createControllableSignal,
  mergeStyle,
} from "@solid-component/utils";
import {
  Accessor,
  createMemo,
  JSX,
  mergeProps,
  splitProps,
  ValidComponent,
} from "solid-js";
import { ColorAreaContext, ColorAreaContextValue } from "./ColorAreaContext";
import { applyOffset, Color, toOffset, TransformOffset } from "./utils";

function clampOffset(value: number) {
  return Math.max(0, Math.min(value, 100));
}

export interface ColorAreaRootOwnProps {
  value?: Color;
  defaultValue?: Color;
  disabled?: boolean;
  onChange?: (color: Color) => void;
  onChangeEnd?: (color: Color) => void;
}

export interface ColorAreaCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<
  JSX.HTMLAttributes<T>,
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "style"
> {}

export interface ColorAreaRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends ColorAreaRootOwnProps, ColorAreaCommonProps<ElementOf<T>> {}

const defaults = {
  defaultValue: new Color("#1677ff"),
} as const;

export default function ColorAreaRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorAreaRootProps<T>>,
) {
  const merged = mergeProps(defaults, props as ColorAreaRootProps);
  const [local, rest] = splitProps(merged, [
    "style",
    "value",
    "defaultValue",
    "onChange",
    "onChangeEnd",
    "disabled",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
  ]);
  const [value, setValue] = createControllableSignal<Color>({
    value: () => local.value,
    defaultValue: merged.defaultValue,
    onChange: (nextColor) => local.onChange?.(nextColor),
  });
  const isSameOffset = (prev: TransformOffset, next: TransformOffset) =>
    prev.x === next.x && prev.y === next.y;
  const offset = createMemo<TransformOffset>(
    (prevOffset) => {
      const nextOffset = toOffset(value()!);

      return prevOffset && isSameOffset(prevOffset, nextOffset)
        ? prevOffset
        : nextOffset;
    },
    toOffset(value()!),
    { equals: isSameOffset },
  );
  let activePointerId: number | null = null;

  const updateOffset = (e: PointerEvent, container: HTMLElement) => {
    const { left, top, width, height } = container.getBoundingClientRect();
    if (width <= 0 || height <= 0) {
      return false;
    }

    const nextOffset = {
      x: clampOffset(((e.clientX - left) / width) * 100),
      y: clampOffset(((e.clientY - top) / height) * 100),
    };
    const nextColor = applyOffset(value()!, nextOffset);

    setValue(nextColor);
    return true;
  };

  const resetDragState = (container: HTMLElement) => {
    if (
      activePointerId !== null &&
      container.hasPointerCapture?.(activePointerId)
    ) {
      container.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
  };

  const onPointerMove: ColorAreaRootProps["onPointerMove"] = (e) => {
    if (e.pointerId === activePointerId) {
      e.preventDefault();
      updateOffset(e, e.currentTarget);
    }
    callHandler(e, local.onPointerMove);
  };

  const onPointerUp: ColorAreaRootProps["onPointerUp"] = (e) => {
    if (e.pointerId === activePointerId) {
      e.preventDefault();
      resetDragState(e.currentTarget);
      local.onChangeEnd?.(value()!);
    }
    callHandler(e, local.onPointerUp);
  };

  const onPointerCancel: ColorAreaRootProps["onPointerCancel"] = (e) => {
    if (e.pointerId === activePointerId) {
      resetDragState(e.currentTarget);
      local.onChangeEnd?.(value()!);
    }
    callHandler(e, local.onPointerCancel);
  };

  const onPointerDown: ColorAreaRootProps["onPointerDown"] = (e) => {
    resetDragState(e.currentTarget);

    if (
      !local.disabled &&
      e.button === 0 &&
      e.isPrimary &&
      updateOffset(e, e.currentTarget)
    ) {
      activePointerId = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    callHandler(e, local.onPointerDown);
  };

  const style = createMemo(() =>
    mergeStyle(
      {
        "touch-action": "none",
        "forced-color-adjust": "none",
        "background-color": `hsl(${value()!.toHsv().h}, 100%, 50%)`,
        "background-image":
          "linear-gradient(0deg, #000, transparent),linear-gradient(90deg, #fff, hsla(0, 0%, 100%, 0))",
      },
      local.style,
    ),
  );

  const context = {
    color: value,
    offset,
  } satisfies ColorAreaContextValue;

  return (
    <ColorAreaContext.Provider value={context}>
      <Polymorphic<ColorAreaCommonProps>
        as="div"
        style={style()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        {...rest}
      />
    </ColorAreaContext.Provider>
  );
}
