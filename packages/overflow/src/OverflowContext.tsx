import { createContext, useContext, type Accessor } from "solid-js";
import { MaybeElement } from "@s-primitives/shared";

export type OverflowItemId = symbol;
export type OverflowItemKey = string | number;
export type OverflowItemRole = "item" | "rest" | "prefix" | "suffix";

export interface OverflowItemRecord {
  id: OverflowItemId;
  key?: OverflowItemKey;
  role: OverflowItemRole;
  el: Accessor<MaybeElement>;
  order: Accessor<number>;
  width: Accessor<number | null>;
}

export interface RegisterOverflowItemOptions {
  id: OverflowItemId;
  key?: OverflowItemKey;
  role?: OverflowItemRole;
  el: Accessor<MaybeElement>;
  order: Accessor<number>;
  width: Accessor<number | null>;
}

export interface OverflowRootContextValue {
  containerWidth: Accessor<number | undefined>;
  restWidth: Accessor<number>;
  prefixWidth: Accessor<number>;
  suffixWidth: Accessor<number>;
  displayCount: Accessor<number>;
  restReady: Accessor<boolean>;
  omittedCount: Accessor<number>;

  items: Accessor<OverflowItemRecord[]>;

  registerItem(options: RegisterOverflowItemOptions): void;
  unregisterItem(id: OverflowItemId): void;

  setRestWidth(width: number | null): void;
  setPrefixWidth(width: number | null): void;
  setSuffixWidth(width: number | null): void;

  getItemWidth(id: OverflowItemId): number | null;
  getItemWidth(record: OverflowItemRecord): number | null;
}

export const OverflowRootContext = createContext<OverflowRootContextValue>();

export function useOverflowRootContext() {
  const context = useContext(OverflowRootContext);

  if (!context) {
    throw new Error("[diagen]: Overflow components must be used within <Overflow.Root>.");
  }

  return context;
}

export interface OverflowItemContextValue {
  role: OverflowItemRole;
  order: Accessor<number>;
  display: Accessor<boolean>;
  responsive: Accessor<boolean>;
  invalidate: Accessor<boolean>;
}

export const OverflowItemContext = createContext<OverflowItemContextValue | null>(null);

export function useOverflowItemContext() {
  return useContext(OverflowItemContext);
}
