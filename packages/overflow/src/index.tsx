import OverflowRoot from "./OverflowRoot";
import OverflowItem from "./OverflowItem";
import OverflowItems from "./OverflowItems";
import OverflowRest from "./OverflowRest";

const Overflow = {};

export default Object.assign(Overflow, {
  Root: OverflowRoot,
  Items: OverflowItems,
  Item: OverflowItem,
  Rest: OverflowRest,
});

export { OverflowItem, OverflowItems, OverflowRest, OverflowRoot };
export type {
  OverflowItemContextValue,
  OverflowItemId,
  OverflowItemKey,
  OverflowItemRecord,
  OverflowItemRole,
  OverflowRootContextValue,
} from "./OverflowContext";
