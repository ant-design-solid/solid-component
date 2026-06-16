import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  composeHandlers,
  mergeRefs
} from "@solid-component/utils";
import { JSX, splitProps, ValidComponent } from "solid-js";
import { useSliderContext } from "./SliderContext";

export interface SliderRailCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "ref" | "children" | "onPointerDown"> {}

export interface SliderRailProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> extends SliderRailCommonProps<ElementOf<T>> {}

export default function SliderRail<T extends ValidComponent>(
  props: PolymorphicProps<T, SliderRailProps<T>>,
) {
  const context = useSliderContext();
  const [local, rest] = splitProps(props, ["ref", "onPointerDown"]);

  const onPointerDown: SliderRailCommonProps["onPointerDown"] = (event) => {
    context.beginSlide(event);
  };

  return (
    <Polymorphic
      as="div"
      ref={mergeRefs(context.setRailRef, local.ref)}
      onPointerDown={composeHandlers(local.onPointerDown, onPointerDown)}
      {...rest}
    />
  );
}
