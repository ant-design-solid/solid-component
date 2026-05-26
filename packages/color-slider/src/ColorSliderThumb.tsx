import { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import type { SliderThumbOwnProps } from "@solid-component/slider";
import { SliderThumb } from "@solid-component/slider";
import { mergeStyle } from "@solid-component/utils";
import { createMemo, JSX, splitProps, type ValidComponent } from "solid-js";
import { useColorSliderContext } from "./ColorSliderContext";

export interface ColorSliderThumbOwnProps extends SliderThumbOwnProps {}

export interface ColorSliderThumbCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "style"
> {}

export interface ColorSliderThumbProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends ColorSliderThumbOwnProps, ColorSliderThumbCommonProps<ElementOf<T>> {}

export default function ColorSliderThumb<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorSliderThumbProps<T>>,
) {
  const context = useColorSliderContext();
  const [local, rest] = splitProps(props as ColorSliderThumbProps, ["style"]);

  const ariaValueText = createMemo(() =>
    context.strategy().getValueText(context.color()),
  );
  const style = createMemo(() =>
    mergeStyle(
      {
        "--color-slider-thumb": context
          .strategy()
          .getThumbColor(context.color()),
      },
      local.style,
    ),
  );

  return (
    <SliderThumb style={style()} aria-valuetext={ariaValueText()} {...rest} />
  );
}
