import Polymorphic, { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import { createControllableSignal, mergeRefs, mergeStyle } from "@solid-component/utils";
import {
  Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  splitProps,
  untrack,
  ValidComponent,
} from "solid-js";
import { ColorAreaContext, ColorAreaContextValue } from "./ColorAreaContext";
import createDragOffset from "./hooks/createDragOffset";
import {
  Color,
  ColorFormatType,
  ColorGenInput,
  ColorValue,
  formatColorValue,
  generateColor,
  toColor,
  toOffset,
  TransformOffset,
} from "./utils";

export interface ColorAreaRootOwnProps<T extends HTMLElement = HTMLElement> {
  ref: T | ((el: T) => void);
  style: string | JSX.CSSProperties;

  value: ColorGenInput;
  defaultValue: ColorGenInput;
  valueFormat: ColorFormatType | ((value: Color) => string);
  disabled: boolean;
  onChange: (color: ColorValue) => void;
  onChangeEnd: (color: ColorValue) => void;
}

export type ColorAreaRootProps<T extends ValidComponent | HTMLElement = HTMLElement> = Partial<
  ColorAreaRootOwnProps<ElementOf<T>>
>;

const defaults = {
  as: "div",
  defaultValue: "#1677ff",
} as const;
export default function ColorAreaRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorAreaRootProps<T>>,
) {
  const [rootRef, setRootRef] = createSignal<HTMLElement>();

  const merged = mergeProps(defaults, props as ColorAreaRootOwnProps);
  const [local, rest] = splitProps(merged, [
    "as",
    "ref",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "onChangeEnd",
    "valueFormat",
    "disabled",
  ]);
  const [value, setValue] = createControllableSignal<Color>({
    value: () => (local.value ? generateColor(local.value) : undefined),
    defaultValue: generateColor(merged.defaultValue),
    onChange: (value) => local.onChange?.(formatOutput(value)),
  });

  const formatOutput = (nextColor: Color) => formatColorValue(nextColor, local.valueFormat);
  const isSameOffset = (prev: TransformOffset, next: TransformOffset) =>
    prev.x === next.x && prev.y === next.y;
  const [displayOffset, setDisplayOffset] = createSignal<TransformOffset>(toOffset(value()!), {
    equals: isSameOffset,
  });

  const onChange = (offset: TransformOffset) => {
    batch(() => {
      // 拖拽时先更新展示态坐标，保证 thumb 反馈即时，不依赖外部受控值回流。
      setDisplayOffset(offset);
      const color = toColor(offset, value()!);
      setValue(color);
    });
  };

  // 受控模式下 pointerup 可能早于父组件回写，因此结束值使用当前展示坐标重新计算。
  const onChangeEnd = () => {
    local.onChangeEnd?.(formatOutput(value()!));
  };

  createDragOffset(
    rootRef,
    onChange,
    onChangeEnd,
    // disabled 需要实时透传给拖拽逻辑，避免只在视觉层禁用。
    () => !!local.disabled,
  );

  createEffect((prevCommittedOffset?: TransformOffset) => {
    const nextCommittedOffset = toOffset(value()!);
    const currentDisplayOffset = untrack(displayOffset);

    // 如果展示态仍停留在上一次提交值，或外部值已经追平当前展示态，则同步到最新提交值。
    if (
      !prevCommittedOffset ||
      isSameOffset(currentDisplayOffset, prevCommittedOffset) ||
      isSameOffset(currentDisplayOffset, nextCommittedOffset)
    ) {
      setDisplayOffset(nextCommittedOffset);
    }

    return nextCommittedOffset;
  });

  const style = createMemo(() =>
    mergeStyle(
      {
        "touch-action": "none",
        "forced-color-adjust": "none",
        "background-color": `hsl(${value()!.toHsb().h},100%, 50%)`,
        "background-image":
          "linear-gradient(0deg, #000, transparent),linear-gradient(90deg, #fff, hsla(0, 0%, 100%, 0))",
      },
      local.style,
    ),
  );

  const context = {
    color: value as Accessor<Color>,
    offset: displayOffset,
  } satisfies ColorAreaContextValue;

  return (
    <ColorAreaContext.Provider value={context}>
      <Polymorphic<ColorAreaRootProps<ElementOf<T>>>
        as={local.as}
        style={style()}
        ref={mergeRefs(local.ref, setRootRef)}
        {...rest}
      />
    </ColorAreaContext.Provider>
  );
}
