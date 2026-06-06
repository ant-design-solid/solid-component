import { KeyOf, ValueOf } from "@solid-primitive/shared";
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
} from "solid-js";
import {
  OverflowItemContext,
  OverflowItemContextValue,
  useOverflowContext,
} from "./OverflowContext";
import type { OverflowItemKey } from "./types";

export interface OverflowItemsOwnProps<T extends readonly any[]> {
  by?: KeyOf<ValueOf<T>> | ((item: T[number]) => OverflowItemKey);
  data: T | undefined | null | false;
  fallback?: JSX.Element;
  children: (item: T[number], index: Accessor<number>) => JSX.Element;
}

export type OverflowItemsProps<T extends readonly any[]> =
  OverflowItemsOwnProps<T>;

export default function OverflowItems<T extends readonly any[]>(
  props: OverflowItemsOwnProps<T>,
) {
  const {
    responsive,
    setSourceCount,
    shouldExpand,
    previewCount,
    collapse,
  } = useOverflowContext();

  const source = createMemo(() => props.data || []);
  const [measurementCount, setMeasurementCount] = createSignal(1);

  createEffect(() => {
    setSourceCount(source().length);
  });

  onCleanup(() => {
    setSourceCount(null);
  });

  createEffect(() => {
    const total = source().length;

    if (!responsive()) {
      setMeasurementCount(total);
      return;
    }

    if (!total) {
      setMeasurementCount(0);
      return;
    }

    const baseCount = previewCount() ?? 1;
    setMeasurementCount((prev) => Math.min(total, Math.max(baseCount, prev)));
  });

  createEffect(() => {
    if (!shouldExpand()) {
      return;
    }

    const total = source().length;
    setMeasurementCount((prev) =>
      Math.min(total, Math.max(prev + 1, prev * 2, 1)),
    );
  });

  const measuredStartIndex = createMemo(() => {
    const list = source();
    if (!responsive() || collapse() !== "start") {
      return 0;
    }

    return Math.max(0, list.length - measurementCount());
  });

  const measuredSource = createMemo(() => {
    const list = source();
    if (!responsive()) {
      return list;
    }

    return list.slice(
      measuredStartIndex(),
      measuredStartIndex() + measurementCount(),
    );
  });

  return (
    <For each={measuredSource()} fallback={props.fallback}>
      {(item, index) => {
        const sourceIndex = createMemo(() => measuredStartIndex() + index());
        const id = () => {
          if (typeof props.by === "function") {
            return props.by(item);
          }
          if (props.by != null) {
            return item?.[props.by] ?? sourceIndex();
          }
          return sourceIndex();
        };

        const itemContext = {
          key: id(),
          index: sourceIndex,
        } satisfies OverflowItemContextValue;

        return (
          <OverflowItemContext.Provider value={itemContext}>
            {props.children(item, sourceIndex)}
          </OverflowItemContext.Provider>
        );
      }}
    </For>
  );
}
