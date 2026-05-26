import { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import { SliderRail } from "@solid-component/slider";
import { mergeStyle } from "@solid-component/utils";
import { createMemo, JSX, splitProps, type ValidComponent } from "solid-js";
import { useColorSliderContext } from "./ColorSliderContext";

export interface ColorSliderRailCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "style"
> {}

export interface ColorSliderRailProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> extends ColorSliderRailCommonProps<ElementOf<T>> {}

export default function ColorSliderRail<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorSliderRailProps<T>>,
) {
  const context = useColorSliderContext();
  const [local, rest] = splitProps(props as ColorSliderRailProps, ["style"]);

  const style = createMemo(() =>
    mergeStyle(
      context.strategy().getRailStyle(context.color()),
      local.style,
    ),
  );

  return <SliderRail style={style()} {...rest} />;
}
