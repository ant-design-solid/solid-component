import { PolymorphicProps } from "@solid-component/polymorphic";
import { ValueOf } from "@solid-primitive/shared";
import { JSX, Show, splitProps, ValidComponent } from "solid-js";
import OverflowItem from "./OverflowItem";
import OverflowItems, { OverflowItemsOwnProps } from "./OverflowItems";
import OverflowPrefix from "./OverflowPrefix";
import OverflowRest, { OverflowRestOwnProps } from "./OverflowRest";
import OverflowRoot, { OverflowRootOwnProps } from "./OverflowRoot";
import OverflowSuffix from "./OverflowSuffix";

type Modules = "prefix" | "suffix" | "rest" | "item";

const ROOT_PROPS = [
  "maxCount",
  "collapse",
  "preview",
  "onOverflowChange",
] as const;

const ITEMS_PROPS = ["by", "data"] as const;
export interface OverflowOwnProps<T extends readonly any[] = readonly any[]>
  extends
    Pick<OverflowRootOwnProps, ValueOf<typeof ROOT_PROPS>>,
    Pick<OverflowItemsOwnProps<T>, ValueOf<typeof ITEMS_PROPS>> {
  prefix?: JSX.Element;
  suffix?: JSX.Element;
  rest?: OverflowRestOwnProps["children"];

  classes?: Partial<Record<Modules, string | undefined>>;
  styles?: Partial<Record<Modules, JSX.CSSProperties | string | undefined>>;

  children?: OverflowItemsOwnProps<T>["children"];
}

export interface OverflowProps<
  T extends readonly any[] = readonly any[],
> extends OverflowOwnProps<T> {}

export default function Overflow<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowProps>,
) {
  const [rootProps, itemsProps, local, rest] = splitProps(
    props as OverflowProps,
    ROOT_PROPS,
    ITEMS_PROPS,
    ["prefix", "suffix", "rest", "classes", "styles", "children"],
  );

  return (
    <OverflowRoot {...rootProps} {...rest}>
      <Show when={local.prefix}>
        {(prefix) => (
          <OverflowPrefix
            class={local.classes?.prefix}
            style={local.styles?.prefix}
          >
            {prefix()}
          </OverflowPrefix>
        )}
      </Show>

      <OverflowItems {...itemsProps}>
        {(item, index) => (
          <OverflowItem class={local.classes?.item} style={local.styles?.item}>
            {local.children?.(item, index)}
          </OverflowItem>
        )}
      </OverflowItems>

      <OverflowRest class={local.classes?.rest} style={local.styles?.rest}>
        {local.rest}
      </OverflowRest>

      <Show when={local.suffix}>
        {(suffix) => (
          <OverflowSuffix
            class={local.classes?.suffix}
            style={local.styles?.suffix}
          >
            {suffix()}
          </OverflowSuffix>
        )}
      </Show>
    </OverflowRoot>
  );
}
