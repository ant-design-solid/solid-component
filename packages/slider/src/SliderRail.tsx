import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { callHandler, mergeRefs } from "@solid-component/utils";
import { JSX, mergeProps, splitProps, ValidComponent } from "solid-js";
import { useSliderContext } from "./SliderContext";

export interface SliderRailCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "ref" | "children" | "onPointerDown"> {}

export interface SliderRailProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> extends SliderRailCommonProps<ElementOf<T>> {}

const defaults = {
  as: "div",
} as const;
export default function SliderRail<T extends ValidComponent>(
  props: PolymorphicProps<T, SliderRailProps<T>>,
) {
  const context = useSliderContext();
  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, [
    "as",
    "ref",
    "children",
    "onPointerDown",
  ]);

  const onPointerDown: SliderRailCommonProps["onPointerDown"] = (event) => {
    context.beginSlide(event);
    callHandler(event, local.onPointerDown);
  };

  return (
    <Polymorphic
      as={local.as}
      ref={mergeRefs(context.setRailRef, local.ref)}
      onPointerDown={onPointerDown}
      {...rest}
    >
      {local.children}
    </Polymorphic>
  );
}
