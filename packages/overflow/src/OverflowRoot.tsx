import Polymorphic, { ElementOf } from "@s-components/polymorphic";
import { mergeRefs } from "@s-components/utils";
import { MaybeElement } from "@s-primitives/shared";
import { createResizeObserver, createShallowCollection } from "@s-primitives/web";
import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  splitProps,
  ValidComponent,
} from "solid-js";
import {
  OverflowRootContext,
  OverflowItemId,
  OverflowItemRecord,
  OverflowRootContextValue,
  RegisterOverflowItemOptions,
} from "./OverflowContext";
import { createBatchedSetter, createBatcher } from "./hooks/createBatcher";

export interface OverflowRootOptions {}

export interface OverflowRootCommonProps<T extends HTMLElement = HTMLElement> {
  ref: T | ((el: T) => void);
}

export interface OverflowRootRenderProps extends OverflowRootCommonProps {}

export type OverflowRootProps<T extends ValidComponent | HTMLElement = HTMLElement> =
  OverflowRootOptions & Partial<OverflowRootCommonProps<ElementOf<T>>>;

const defaults = {
  as: "div",
} as const;

export default function OverflowRoot(props: OverflowRootProps) {
  const merged = mergeProps(props, defaults);
  const [local, rest] = splitProps(merged, ["as", "ref"]);

  const batcher = createBatcher();
  const [containerWidth, _setContainerWidth] = createSignal<number>();
  const setContainerWidth = createBatchedSetter(_setContainerWidth, batcher);
  const [restWidth, _setRestWidth] = createSignal<number>(0);
  const setRestWidth = createBatchedSetter(_setRestWidth, batcher);
  const itemRecords = createShallowCollection(new Map<OverflowItemId, OverflowItemRecord>());
  const [prefixWidth, _setPrefixWidth] = createSignal(0);
  const [suffixWidth, _setSuffixWidth] = createSignal(0);
  const setPrefixWidth = createBatchedSetter(_setPrefixWidth, batcher);
  const setSuffixWidth = createBatchedSetter(_setSuffixWidth, batcher);
  const [displayCount, _setDisplayCount] = createSignal(0);
  const setDisplayCount = createBatchedSetter(_setDisplayCount, batcher);
  const [restReady, _setRestReady] = createSignal(false);
  const setRestReady = createBatchedSetter(_setRestReady, batcher);

  const [rootRef, setRootRef] = createSignal<MaybeElement>();

  createResizeObserver(rootRef, ([entry]) => {
    const { clientWidth } = entry.target;
    setContainerWidth(clientWidth);
  });

  const items = createMemo(() =>
    Array.from(itemRecords.values())
      .filter((record) => record.role === "item")
      .sort((a, b) => a.order() - b.order()),
  );
  const omittedCount = createMemo(() => Math.max(items().length - displayCount() - 1, 0));

  const registerItem = (options: RegisterOverflowItemOptions) => {
    batcher.enqueue(() => {
      itemRecords.set(options.id, {
        id: options.id,
        key: options.key,
        role: options.role ?? "item",
        el: options.el,
        order: options.order,
        width: options.width,
      });
    });
  };

  const unregisterItem = (id: OverflowItemId) => {
    batcher.enqueue(() => {
      itemRecords.delete(id);
    });
  };

  const getItemWidth = (val: any) => {
    let record: OverflowItemRecord | undefined;
    if (typeof val === "symbol") {
      record = itemRecords.get(val);
    } else if (typeof val === "object") {
      record = val;
    }
    if (!record) return null;

    return record.width();
  };

  createEffect(() => {
    const container = containerWidth();
    const rest = restWidth();
    const prefix = prefixWidth();
    const suffix = suffixWidth();
    const currentItems = items();

    if (container == null) {
      return;
    }

    if (!currentItems.length) {
      setDisplayCount(0);
      setRestReady(false);
      return;
    }

    let totalWidth = prefix + suffix;
    const lastIndex = currentItems.length - 1;

    for (let index = 0; index < currentItems.length; index += 1) {
      const width = getItemWidth(currentItems[index]);

      if (width == null) {
        setDisplayCount(Math.max(index - 1, 0));
        setRestReady(false);
        return;
      }

      totalWidth += width;

      if (
        (lastIndex === 0 && totalWidth <= container) ||
        (index === lastIndex - 1 &&
          totalWidth + (getItemWidth(currentItems[lastIndex]) ?? 0) <= container)
      ) {
        setDisplayCount(lastIndex);
        setRestReady(index < lastIndex);
        return;
      }

      if (totalWidth + rest > container) {
        setDisplayCount(Math.max(index - 1, 0));
        setRestReady(true);
        return;
      }
    }
  });

  const context = {
    containerWidth,
    restWidth,
    prefixWidth,
    suffixWidth,
    displayCount,
    restReady,
    omittedCount,
    items,
    registerItem,
    unregisterItem,
    setRestWidth: (width) => setRestWidth(width ?? 0),
    setPrefixWidth: (width) => setPrefixWidth(width ?? 0),
    setSuffixWidth: (width) => setSuffixWidth(width ?? 0),
    getItemWidth,
  } satisfies OverflowRootContextValue;

  return (
    <OverflowRootContext.Provider value={context}>
      <Polymorphic<OverflowRootRenderProps>
        as={local.as}
        ref={mergeRefs(local.ref, setRootRef)}
        {...rest}
      />
    </OverflowRootContext.Provider>
  );
}
