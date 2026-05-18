import { PolymorphicProps } from "@solid-component/polymorphic";
import { Show, splitProps, ValidComponent } from "solid-js";
import OverflowItem from "./OverflowItem";
import OverflowItems, { OverflowItemsOwnProps } from "./OverflowItems";
import OverflowPrefix, { OverflowPrefixOwnProps } from "./OverflowPrefix";
import OverflowRest, { OverflowRestOwnProps } from "./OverflowRest";
import OverflowRoot, { OverflowRootOwnProps } from "./OverflowRoot";
import OverflowSuffix, { OverflowSuffixOwnProps } from "./OverflowSuffix";

export interface OverflowOwnProps<T extends readonly any[] = readonly any[]> {
  maxCount?: OverflowRootOwnProps["maxCount"];
  collapse?: OverflowRootOwnProps["collapse"];
  data?: OverflowItemsOwnProps<T>["each"];
  itemKey?: OverflowItemsOwnProps<T>["itemKey"];
  estimatedItemWidth?: OverflowItemsOwnProps<T>["estimatedItemWidth"];

  prefix?: OverflowPrefixOwnProps["children"];
  suffix?: OverflowSuffixOwnProps["children"];
  rest?: OverflowRestOwnProps["children"];

  children?: OverflowItemsOwnProps<T>["children"];
}

export type OverflowProps<T extends readonly any[] = readonly any[]> =
  OverflowOwnProps<T>;

function Overflow<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowProps>,
) {
  const [local, ...rest] = splitProps(props, [
    "maxCount",
    "collapse",
    "data",
    "itemKey",
    "estimatedItemWidth",

    "prefix",
    "suffix",
    "rest",
    "children",
  ]);

  return (
    <OverflowRoot maxCount={local.maxCount} collapse={local.collapse} {...rest}>
      <Show when={local.prefix}>
        {(prefix) => <OverflowPrefix>{prefix()}</OverflowPrefix>}
      </Show>

      <OverflowItems
        each={local.data}
        itemKey={local.itemKey}
        estimatedItemWidth={local.estimatedItemWidth}
        children={local.children!}
      />

      <OverflowRest children={local.rest} />

      <Show when={local.suffix}>
        {(suffix) => <OverflowSuffix>{suffix()}</OverflowSuffix>}
      </Show>
    </OverflowRoot>
  );
}

export default Object.assign(Overflow, {
  Root: OverflowRoot,
  Prefix: OverflowPrefix,
  Items: OverflowItems,
  Item: OverflowItem,
  Rest: OverflowRest,
  Suffix: OverflowSuffix,
});

export {
  OverflowItem,
  OverflowItems,
  OverflowPrefix,
  OverflowRest,
  OverflowRoot,
  OverflowSuffix,
};

export type { OverflowItemOwnProps, OverflowItemProps } from "./OverflowItem";
export type { OverflowItemsOwnProps, OverflowItemsProps } from "./OverflowItems";
export type { OverflowPrefixOwnProps, OverflowPrefixProps } from "./OverflowPrefix";
export type { OverflowRestOwnProps, OverflowRestProps } from "./OverflowRest";
export type { OverflowRootOwnProps, OverflowRootProps } from "./OverflowRoot";
export type { OverflowSuffixOwnProps, OverflowSuffixProps } from "./OverflowSuffix";

export type {
  OverflowItemContextValue,
  OverflowItemId,
  OverflowItemKey,
  OverflowItemRecord,
  OverflowItemRole,
  OverflowContextValue,
} from "./OverflowContext";
export {
  useOverflowItemContext,
  useOverflowContext,
} from "./OverflowContext";
