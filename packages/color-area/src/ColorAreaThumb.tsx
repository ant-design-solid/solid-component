import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import {
  createMemo,
  JSX,
  splitProps,
  ValidComponent
} from "solid-js";
import { useColorAreaContext } from "./ColorAreaContext";

export interface ColorAreaThumbOwnProps {}
export interface ColorAreaThumbCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "style"> {
  children?: JSX.Element | ((color: string) => JSX.Element);
}

export interface ColorAreaThumbProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends ColorAreaThumbOwnProps, ColorAreaThumbCommonProps<ElementOf<T>> {}

export default function ColorAreaThumb<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorAreaThumbProps<T>>,
) {
  const context = useColorAreaContext();
  const [local, rest] = splitProps(props as ColorAreaThumbProps, [
    "style",
    "children",
  ]);

  const currentColor = createMemo(() => context.color().format("rgb"));
  const style = createMemo(() => {
    const offset = context.offset();
    return mergeStyle(
      {
        position: "absolute",
        left: `${offset.x}%`,
        top: `${offset.y}%`,
        "z-index": 1,
        transform: "translate(-50%, -50%)",
        "forced-color-adjust": "none",
        "touch-action": "none",
        "--color-current": currentColor(),
      },
      local.style,
    );
  });
  return (
    <Polymorphic as="div" style={style()} role="presentation" {...rest}>
      {typeof local.children === "function"
        ? local.children(currentColor())
        : local.children}
    </Polymorphic>
  );
}
