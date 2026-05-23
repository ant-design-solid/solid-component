import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import {
  createMemo,
  JSX,
  mergeProps,
  splitProps,
  ValidComponent,
} from "solid-js";
import { useSliderContext } from "./SliderContext";
import { getFillStyle } from "./utils/direction";
export interface SliderTrackOwnProps {}

export interface SliderTrackCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "style"> {}

export interface SliderTrackProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends SliderTrackOwnProps, SliderTrackCommonProps<ElementOf<T>> {}

const defaults = {
  as: "div",
} as const;

export default function SliderTrack<T extends ValidComponent>(
  props: PolymorphicProps<T, SliderTrackProps<T>>,
) {
  const context = useSliderContext();
  const merged = mergeProps(defaults, props as SliderTrackProps);
  const [local, rest] = splitProps(merged, ["as", "style"]);

  const style = createMemo(() => {
    const values = context.values();

    const [min, max] = values.reduce(
      (acc, cur) => {
        const percent = context.getValuePercent(cur);
        return [Math.min(acc[0], percent), Math.max(acc[1], percent)];
      },
      [100, 0],
    );

    return mergeStyle(
      getFillStyle(min, 100 - max, context.direction()),
      local.style,
    );
  });

  return (
    <Polymorphic as={local.as} style={style()} aria-hidden="true" {...rest} />
  );
}
