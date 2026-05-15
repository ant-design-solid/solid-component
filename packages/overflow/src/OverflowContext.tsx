import {
  MaybeElement,
  type Batcher
} from "@solid-primitive/shared";
import { createContext, useContext, type Accessor } from "solid-js";

export type OverflowItemId = symbol;
export type OverflowItemKey = string | number;
export type OverflowItemRole = "item" | "rest" | "prefix" | "suffix";
export type OverflowCollapse = "start" | "end";
export type OverflowVisibleRange = readonly [start: number, end: number];

export interface OverflowItemRecord {
  id: OverflowItemId;
  key?: OverflowItemKey;
  role: OverflowItemRole;
  el: Accessor<MaybeElement>;
  order: Accessor<number>;
  width: Accessor<number | null>;
}

export type RegisterOverflowItemOptions = OverflowItemRecord;

export interface OverflowRootContextValue {
  batcher: Batcher;

  responsive: Accessor<boolean>;
  invalidate: Accessor<boolean>;
  collapse: Accessor<OverflowCollapse>;
  containerWidth: Accessor<number | undefined>;

  renderRest: Accessor<boolean>;
  showRest: Accessor<boolean>;
  needMoreItems: Accessor<boolean>;

  sourceCount: Accessor<number>;
  displayCount: Accessor<number>;
  visibleRange: Accessor<OverflowVisibleRange>;
  omittedCount: Accessor<number>;
  suffixInsetStart: Accessor<number | null>;

  setSourceCount(count: number): void;
  registerItem(options: RegisterOverflowItemOptions): void;
  unregisterItem(id: OverflowItemId): void;

  getItemWidth(id: OverflowItemId): number | null;
  getItemWidth(record: OverflowItemRecord): number | null;
}

export const OverflowRootContext = createContext<OverflowRootContextValue>();

export function useOverflowRootContext() {
  const context = useContext(OverflowRootContext);

  if (!context) {
    throw new Error(
      "[diagen]: Overflow components must be used within <Overflow.Root>.",
    );
  }

  return context;
}

export interface OverflowItemContextValue {
  id: OverflowItemId;
  itemKey?: OverflowItemKey;
  role: OverflowItemRole;
  order: Accessor<number>;
  show: Accessor<boolean>;
}

export const OverflowItemContext =
  createContext<OverflowItemContextValue | null>(null);

export function useOverflowItemContext() {
  return useContext(OverflowItemContext);
}
