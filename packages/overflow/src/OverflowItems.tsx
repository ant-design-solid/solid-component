import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX
} from "solid-js";
import {
  OverflowItemContext,
  OverflowItemContextValue,
  OverflowItemKey,
  useOverflowRootContext,
} from "./OverflowContext";

export interface OverflowItemsOwnProps<T extends readonly any[]> {
  itemKey?: OverflowItemKey | ((item: T[number]) => OverflowItemKey);
  estimatedItemWidth?: number;
  each: T | undefined | null | false;
  fallback?: JSX.Element;
  children: (item: T[number], index: Accessor<number>) => JSX.Element;
}

export type OverflowItemsProps<T extends readonly any[]> =
  OverflowItemsOwnProps<T>;

export default function OverflowItems<T extends readonly any[]>(
  props: OverflowItemsOwnProps<T>,
) {
  const rootContext = useOverflowRootContext();

  const [measurementCount, setMeasurementCount] = createSignal(1);
  const source = createMemo(() => props.each || []);

  createEffect(() => {
    rootContext.setSourceCount(source().length);
  });

  createEffect(() => {
    const total = source().length;

    if (!rootContext.responsive()) {
      setMeasurementCount(total);
      return;
    }

    if (!total) {
      setMeasurementCount(0);
      return;
    }

    const estimatedItemWidth = props.estimatedItemWidth ?? 10;
    const containerWidth = rootContext.containerWidth();
    const baseCount = containerWidth
      ? Math.max(1, Math.floor(containerWidth / estimatedItemWidth))
      : 1;

    setMeasurementCount((prev) => Math.min(total, Math.max(baseCount, prev)));
  });

  createEffect(() => {
    if (!rootContext.needMoreItems()) {
      return;
    }

    const total = source().length;
    setMeasurementCount((prev) =>
      Math.min(total, Math.max(prev + 1, prev * 2, 1)),
    );
  });

  const measuredStartIndex = createMemo(() => {
    const list = source();
    if (!rootContext.responsive() || rootContext.collapse() !== "start") {
      return 0;
    }

    return Math.max(0, list.length - measurementCount());
  });

  const measuredSource = createMemo(() => {
    const list = source();
    if (!rootContext.responsive()) {
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
        const id = Symbol("overflow-item");
        const sourceIndex = createMemo(() => measuredStartIndex() + index());
        const itemKey = () => {
          if (typeof props.itemKey === "function") {
            return props.itemKey(item);
          }
          if (props.itemKey != null) {
            return (item as any)?.[props.itemKey] ?? sourceIndex();
          }
          return sourceIndex();
        };
        const show = createMemo(() => {
          const [start, end] = rootContext.visibleRange();
          return sourceIndex() >= start && sourceIndex() <= end;
        });

        const itemContext = {
          id,
          itemKey: itemKey(),
          order: sourceIndex,
          role: "item",
          show,
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
