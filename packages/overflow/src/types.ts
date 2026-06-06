import type { OrderedRegistryRecord } from "@solid-component/utils";
import type { Accessor } from "solid-js";

export type OverflowItemUid = symbol;
export type OverflowItemKey = string | number;
export type OverflowCollapse = "start" | "end";
export type OverflowVisibleRange = readonly [start: number, end: number];

export interface OverflowChangeInfo {
  visibleKeys: readonly OverflowItemKey[];
  omittedKeys: readonly OverflowItemKey[];
  omittedCount: number;
}

export interface OverflowItemRecord extends OrderedRegistryRecord {
  uid: OverflowItemUid;
  key?: OverflowItemKey;
  width: Accessor<number | null>;
}
