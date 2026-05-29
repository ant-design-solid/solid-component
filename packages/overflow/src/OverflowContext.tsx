import { MaybeElement, type Batcher } from "@solid-primitive/shared";
import { createContext, useContext, type Accessor } from "solid-js";

export type OverflowItemUid = symbol;
export type OverflowItemKey = string | number;
export type OverflowItemRole = "item" | "rest" | "prefix" | "suffix";
export type OverflowCollapse = "start" | "end";
export type OverflowVisibleRange = readonly [start: number, end: number];

export interface OverflowItemRecord {
  uid: OverflowItemUid;
  key?: OverflowItemKey;
  role: OverflowItemRole;
  el: Accessor<MaybeElement>;
  order: Accessor<number>;
  width: Accessor<number | null>;
}

export type RegisterOverflowItemOptions = OverflowItemRecord;

export interface OverflowContextValue {
  batcher: Batcher;

  responsive: Accessor<boolean>;
  invalidate: Accessor<boolean>;
  collapse: Accessor<OverflowCollapse>;
  containerWidth: Accessor<number | undefined>;

  renderRest: Accessor<boolean>;
  shouldExpand: Accessor<boolean>;

  sourceCount: Accessor<number>;
  setSourceCount(count: number | null): void;

  visibleRange: Accessor<OverflowVisibleRange>;
  omittedCount: Accessor<number>;
  suffixInsetStart: Accessor<number | null>;

  registerItem(options: RegisterOverflowItemOptions): void;
  unregisterItem(id: OverflowItemUid): void;

  getItemWidth(uid: OverflowItemUid): number | null;
  getItemWidth(record: OverflowItemRecord): number | null;
}

export const OverflowContext = createContext<OverflowContextValue>();

export function useOverflowContext() {
  const context = useContext(OverflowContext);

  if (!context) {
    throw new Error(
      "[diagen]: Overflow components must be used within <Overflow.Root>.",
    );
  }

  return context;
}

export interface OverflowItemContextValue {
  key?: OverflowItemKey;
  role: OverflowItemRole;
  order: Accessor<number>;
}

export const OverflowItemContext =
  createContext<OverflowItemContextValue | null>(null);

export function useOverflowItemContext() {
  return useContext(OverflowItemContext);
}
