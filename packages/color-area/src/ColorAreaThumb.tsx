import Polymorphic, { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import { createMemo, JSX, mergeProps, splitProps, ValidComponent } from "solid-js";
import { useColorAreaContext } from "./ColorAreaContext";

export interface ColorAreaThumbOwnProps<T extends HTMLElement = HTMLElement> {
  style: string | JSX.CSSProperties;

  children: JSX.Element | ((color: string) => JSX.Element);
}

export type ColorAreaThumbProps<T extends ValidComponent | HTMLElement = HTMLElement> = Partial<
  ColorAreaThumbOwnProps<ElementOf<T>>
>;

const defaults = {
  as: "div",
} as const;
export default function ColorAreaThumb<T extends ValidComponent>(
  props: PolymorphicProps<T, ColorAreaThumbProps<T>>,
) {
  const context = useColorAreaContext();
  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, ["as", "style", "children"]);

  const currentColor = createMemo(() => context.color().toRgbString());
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
    <Polymorphic as={local.as} style={style()} role="presentation" {...rest}>
      {typeof local.children === "function" ? local.children(currentColor()) : local.children}
    </Polymorphic>
  );
}
