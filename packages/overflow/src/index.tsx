import Overflow from "./Overflow";
import OverflowItem from "./OverflowItem";
import OverflowItems from "./OverflowItems";
import OverflowPrefix from "./OverflowPrefix";
import OverflowRest from "./OverflowRest";
import OverflowRoot from "./OverflowRoot";
import OverflowSuffix from "./OverflowSuffix";

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

export type { OverflowOwnProps, OverflowProps } from "./Overflow";
export type { OverflowItemOwnProps, OverflowItemProps } from "./OverflowItem";
export type {
  OverflowItemsOwnProps,
  OverflowItemsProps,
} from "./OverflowItems";
export type {
  OverflowPrefixOwnProps,
  OverflowPrefixProps,
} from "./OverflowPrefix";
export type { OverflowRestOwnProps, OverflowRestProps } from "./OverflowRest";
export type { OverflowRootOwnProps, OverflowRootProps } from "./OverflowRoot";
export type {
  OverflowSuffixOwnProps,
  OverflowSuffixProps,
} from "./OverflowSuffix";

export { useOverflowContext, useOverflowItemContext } from "./OverflowContext";
export type {
  OverflowContextValue,
  OverflowItemContextValue,
  OverflowItemKey,
  OverflowItemRecord,
  OverflowItemRole,
  OverflowItemUid,
} from "./OverflowContext";
