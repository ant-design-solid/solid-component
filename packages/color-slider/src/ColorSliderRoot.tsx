import { PolymorphicProps } from "@solid-component/polymorphic";
import type { SliderRootOwnProps } from "@solid-component/slider";
import { SliderRoot } from "@solid-component/slider";
import {
  Color,
  type ColorInput,
  createControllableSignal,
} from "@solid-component/utils";
import { createMemo, mergeProps, splitProps, ValidComponent } from "solid-js";
import { ColorSliderContext } from "./ColorSliderContext";
import {
  COLOR_SLIDER_STRATEGIES,
  type ColorSliderStrategy,
  type ColorSliderType,
} from "./strategies";

export interface ColorSliderRootOwnProps extends Pick<
  SliderRootOwnProps<number>,
  "vertical" | "reverse" | "disabled" | "max" | "min" | "step"
> {
  value?: Color;
  defaultValue?: ColorInput;
  type?: ColorSliderType;
  onChange?: (color: Color) => void;
  onChangeEnd?: (color: Color) => void;
}

export interface ColorSliderRootProps extends ColorSliderRootOwnProps {}

const defaults = {
  type: "hue",
  defaultValue: new Color("#1677ff"),
  keyboard: true,
  disabled: false,
} as const;
export default function ColorSliderRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorSliderRootProps>,
) {
  const merged = mergeProps(defaults, props as ColorSliderRootProps);
  const [local, rest] = splitProps(merged, [
    "value",
    "defaultValue",
    "type",
    "min",
    "max",
    "step",
    "onChange",
    "onChangeEnd",
  ]);

  const [color, setColor] = createControllableSignal<Color>({
    value: () => local.value,
    defaultValue: new Color(local.defaultValue),
    onChange: (nextColor) => local.onChange?.(nextColor),
  });

  const strategy = createMemo<ColorSliderStrategy>(
    () => COLOR_SLIDER_STRATEGIES[local.type],
  );
  const sliderValue = createMemo(() => strategy().getValue(color()));

  const handleChange = (nextValue: number) => {
    setColor((prevColor) => strategy().setValue(prevColor, nextValue));
  };

  const handleChangeEnd = (nextValue: number) => {
    local.onChangeEnd?.(strategy().setValue(color(), nextValue));
  };

  return (
    <ColorSliderContext.Provider
      value={{
        color,
        type: () => local.type,
        strategy,
      }}
    >
      <SliderRoot
        value={sliderValue()}
        min={local.min ?? strategy().min}
        max={local.max ?? strategy().max}
        step={local.step ?? strategy().step}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        {...rest}
      />
    </ColorSliderContext.Provider>
  );
}
