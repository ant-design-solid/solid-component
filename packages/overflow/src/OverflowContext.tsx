import { error } from "@solid-component/utils";
import { createContext, useContext, type Accessor } from "solid-js";
import type {
  OverflowCollapse,
  OverflowItemKey,
  OverflowItemRecord,
  OverflowItemUid,
  OverflowChangeInfo,
  OverflowVisibleRange,
} from "./types";

export interface OverflowContextValue {
  responsive: Accessor<boolean>;
  invalidate: Accessor<boolean>;
  measuring: Accessor<boolean>;
  collapse: Accessor<OverflowCollapse>;

  showRest: Accessor<boolean>;
  shouldExpand: Accessor<boolean>;
  previewCount: Accessor<number | null>;
  previewRange: Accessor<OverflowVisibleRange | null>;

  sourceCount: Accessor<number>;
  setSourceCount(count: number | null): void;

  visibleRange: Accessor<OverflowVisibleRange>;
  changeInfo: Accessor<OverflowChangeInfo>;

  suffixInsetStart: Accessor<number | null>;
  setPrefixWidth(width: number | null): void;
  setRestWidth(width: number | null): void;
  setSuffixWidth(width: number | null): void;

  registerItem(options: OverflowItemRecord): void;
  unregisterItem(id: OverflowItemUid): void;

  getItemOrder(uid: OverflowItemUid): number | undefined;
  getItemOrder(record: OverflowItemRecord): number | undefined;
}

export const OverflowContext = createContext<OverflowContextValue>();

export function useOverflowContext() {
  const context = useContext(OverflowContext);

  if (!context) {
    error("Overflow components must be used within <Overflow.Root>.", {
      package: "overflow",
    });
  }

  return context;
}

export interface OverflowItemContextValue {
  key?: OverflowItemKey;
  index: Accessor<number>;
}

export const OverflowItemContext =
  createContext<OverflowItemContextValue | null>(null);

export function useOverflowItemContext() {
  return useContext(OverflowItemContext);
}
