import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeRefs } from "@solid-component/utils";
import { createBatcher, createCollection } from "@solid-primitive/shared";
import { createResizeObserver } from "@solid-primitive/web";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onMount,
  splitProps,
  ValidComponent,
} from "solid-js";
import {
  OverflowCollapse,
  OverflowItemRecord,
  OverflowItemUid,
  OverflowContext,
  OverflowContextValue,
  OverflowVisibleRange,
  RegisterOverflowItemOptions,
} from "./OverflowContext";
import { PREFIX_UID } from "./OverflowPrefix";
import { REST_UID } from "./OverflowRest";
import { SUFFIX_UID } from "./OverflowSuffix";

const RESPONSIVE = "responsive" as const;
const INVALIDATE = "invalidate" as const;

export interface OverflowRootOwnProps<T extends HTMLElement = HTMLElement> {
  maxCount?: number | typeof RESPONSIVE | typeof INVALIDATE;
  collapse?: OverflowCollapse;
  ref: T | ((el: T) => void);
  onVisibleChange?: (count: number) => void;
}

export type OverflowRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Partial<OverflowRootOwnProps<ElementOf<T>>>;

const defaults = {
  as: "div",
  collapse: "end",
} as const;

export default function OverflowRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowRootProps<T>>,
) {
  const batcher = createBatcher({
    schedule: "microtask",
  });
  const merged = mergeProps(defaults, props as OverflowRootProps);
  const [local, rest] = splitProps(merged, [
    "as",
    "ref",
    "maxCount",
    "collapse",
    "onVisibleChange",
  ]);
  const [containerWidth, setContainerWidth] = createSignal<number>();
  const itemRecords = createCollection(
    new Map<OverflowItemUid, OverflowItemRecord>(),
  );
  const [sourceCountOverride, setSourceCountOverride] = createSignal<
    number | null
  >(null);
  const [visibleRange, setVisibleRange] = createSignal<OverflowVisibleRange>([
    0, 0,
  ]);
  const [suffixInsetStart, setSuffixInsetStart] = createSignal<number | null>(
    null,
  );

  const [rootRef, setRootRef] = createSignal<HTMLElement>();

  const renderedItems = createMemo(() =>
    Array.from(itemRecords.values())
      .filter((record) => record.role === "item")
      .sort((a, b) => a.order() - b.order()),
  );
  const sourceCount = createMemo(
    () => sourceCountOverride() ?? renderedItems().length,
  );

  const restRecord = createMemo(() => itemRecords.get(REST_UID));
  const measuredRestWidth = createMemo(() => restRecord()?.width() ?? null);
  const restWidth = createMemo(() => measuredRestWidth() ?? 0);
  const prefixRecord = createMemo(() => itemRecords.get(PREFIX_UID));
  const prefixWidth = createMemo(() => prefixRecord()?.width() ?? 0);
  const suffixRecord = createMemo(() => itemRecords.get(SUFFIX_UID));
  const suffixWidth = createMemo(() => suffixRecord()?.width() ?? 0);

  const [stableRestWidth, setStableRestWidth] = createSignal(0);

  createEffect(() => {
    const next = restWidth();
    setStableRestWidth(renderRest() ? next : 0);
  });

  const isResponsive = createMemo(() => local.maxCount === RESPONSIVE);
  const shouldResponsive = createMemo(
    () => !!itemRecords.size && isResponsive(),
  );
  const isInvalidate = createMemo(() => local.maxCount === INVALIDATE);
  const collapse = createMemo(() => local.collapse);
  const renderRest = createMemo(
    () =>
      isResponsive() ||
      (typeof local.maxCount === "number" && sourceCount() > local.maxCount),
  );

  createResizeObserver(rootRef, ([entry]) => {
    const { clientWidth } = entry.target;
    void batcher.submit(() => {
      setContainerWidth(clientWidth);
    });
  });

  createEffect(() => {
    const el = rootRef();
    el && setContainerWidth(el.clientWidth);
  });

  const omittedCount = createMemo(() => {
    const [start, end] = visibleRange();
    return Math.max(sourceCount() - Math.max(end - start + 1, 0), 0);
  });

  const shouldExpand = createMemo(() => {
    if (!shouldResponsive()) {
      return false;
    }

    const items = renderedItems();
    if (!items.length) {
      return false;
    }

    if (items.length >= sourceCount()) {
      return false;
    }

    const widthsReady = items.every((record) => record.width() != null);
    if (!widthsReady) {
      return false;
    }

    const [start, end] = visibleRange();

    if (collapse() === "start") {
      return start <= items[0].order();
    }

    return end >= items[items.length - 1].order();
  });

  const registerItem = (options: RegisterOverflowItemOptions) => {
    itemRecords.set(options.uid, options);
  };

  const unregisterItem = (uid: OverflowItemUid) => {
    itemRecords.delete(uid);
  };

  const getItemWidth = (val: OverflowItemUid | OverflowItemRecord) => {
    let record: OverflowItemRecord | undefined;
    if (typeof val === "symbol") {
      record = itemRecords.get(val);
    } else if (typeof val === "object") {
      record = val;
    }
    if (!record) return null;

    return record.width();
  };

  const setSourceCount = (count: number | null) => {
    setSourceCountOverride(count);
  };

  const getInlineGap = () => {
    const root = rootRef();
    if (!root || typeof getComputedStyle !== "function") {
      return 0;
    }

    const style = getComputedStyle(root);
    const gap = Number.parseFloat(style.columnGap || style.gap || "0");
    return Number.isFinite(gap) ? gap : 0;
  };

  const commitVisibleRange = (
    range: OverflowVisibleRange,
    visibleCount?: number,
  ) => {
    setVisibleRange(range);
    if (visibleCount != null) {
      local.onVisibleChange?.(visibleCount);
    }
  };
  createEffect(() => {
    const container = containerWidth();
    const rest = stableRestWidth();
    const prefix = prefixWidth();
    const suffix = suffixWidth();
    const currentItems = renderedItems();
    const columnGap = getInlineGap();

    setSuffixInsetStart(null);

    const len = currentItems.length;
    if (!len) {
      commitVisibleRange([0, -1], 0);
      return;
    }

    if (!isResponsive()) {
      const lastIndex = len - 1;
      const firstOrder = currentItems[0].order();
      const lastOrder = currentItems[lastIndex].order();

      if (typeof local.maxCount !== "number") {
        commitVisibleRange([firstOrder, lastOrder], len);
        return;
      }

      const visibleCount = Math.max(0, Math.min(local.maxCount, len));

      if (visibleCount === 0) {
        commitVisibleRange([firstOrder, firstOrder - 1], 0);
        return;
      }

      if (collapse() === "start") {
        const startOrder = currentItems[len - visibleCount].order();
        commitVisibleRange([startOrder, lastOrder], visibleCount);
        return;
      }

      const endOrder = currentItems[visibleCount - 1].order();
      commitVisibleRange([firstOrder, endOrder], visibleCount);
      return;
    }

    if (!container) {
      return;
    }

    const lastIndex = len - 1;
    const firstRecord = currentItems[0];
    const lastRecord = currentItems[lastIndex];
    const firstOrder = firstRecord.order();
    const lastOrder = lastRecord.order();
    const firstWidth = firstRecord.width();
    const lastWidth = lastRecord.width();
    const prefixCount = prefixRecord() ? 1 : 0;
    const suffixCount = suffixRecord() ? 1 : 0;
    const fixedCount = prefixCount + suffixCount;
    const fixedWidth = prefix + suffix;

    let totalWidth = fixedWidth;

    const widthWithGap = (width: number, count: number) =>
      width + columnGap * Math.max(count - 1, 0);
    const allItemsFit = (width: number) =>
      widthWithGap(width, fixedCount + len) <= container;
    const overflowsWithRest = (width: number, visibleCount: number) =>
      widthWithGap(width + rest, fixedCount + visibleCount + 1) > container;

    batch(() => {
      if (collapse() === "start") {
        for (let index = lastIndex; index >= 0; index -= 1) {
          const width = currentItems[index].width();

          if (width == null) {
            const nextStart = Math.min(index + 1, lastIndex);
            commitVisibleRange([currentItems[nextStart].order(), lastOrder]);
            break;
          }

          totalWidth += width;
          const visibleCount = lastIndex - index + 1;

          if (
            (lastIndex === 0 && allItemsFit(totalWidth)) ||
            (index === 1 &&
              firstWidth != null &&
              allItemsFit(totalWidth + firstWidth))
          ) {
            commitVisibleRange([firstOrder, lastOrder], len);
            break;
          }

          if (overflowsWithRest(totalWidth, visibleCount)) {
            const nextStart = Math.min(index + 1, lastIndex);
            commitVisibleRange(
              [currentItems[nextStart].order(), lastOrder],
              lastIndex - nextStart + 1,
            );
            break;
          }
        }
      } else {
        for (let index = 0; index < len; index += 1) {
          const width = currentItems[index].width();

          if (width == null) {
            const nextEnd = Math.max(index - 1, 0);
            commitVisibleRange([firstOrder, currentItems[nextEnd].order()]);
            break;
          }

          totalWidth += width;
          const visibleCount = index + 1;

          if (
            (lastIndex === 0 && allItemsFit(totalWidth)) ||
            (index === lastIndex - 1 &&
              lastWidth != null &&
              allItemsFit(totalWidth + lastWidth))
          ) {
            commitVisibleRange([firstOrder, lastOrder], len);
            break;
          }

          if (overflowsWithRest(totalWidth, visibleCount)) {
            const nextEnd = index - 1;
            const nextVisibleCount = Math.max(nextEnd + 1, 0);
            const visibleWidth = Math.max(totalWidth - width - fixedWidth, 0);
            const elementsBeforeSuffix = prefixCount + nextVisibleCount + 1;
            commitVisibleRange(
              [
                firstOrder,
                nextEnd >= 0 ? currentItems[nextEnd].order() : firstOrder - 1,
              ],
              nextVisibleCount,
            );
            setSuffixInsetStart(
              prefix + visibleWidth + rest + columnGap * elementsBeforeSuffix,
            );
            break;
          }
        }
      }
      if (
        suffixRecord() &&
        firstWidth != null &&
        firstWidth + suffix > container
      ) {
        setSuffixInsetStart(null);
      }
    });
  });

  const context = {
    batcher,

    responsive: isResponsive,
    invalidate: isInvalidate,
    collapse,
    containerWidth,

    renderRest,
    shouldExpand,

    sourceCount,
    setSourceCount,

    visibleRange,
    omittedCount,

    suffixInsetStart,

    registerItem,
    unregisterItem,

    getItemWidth,
  } satisfies OverflowContextValue;

  return (
    <OverflowContext.Provider value={context}>
      <Polymorphic<OverflowRootOwnProps<ElementOf<T>>>
        as={local.as}
        ref={mergeRefs(local.ref, setRootRef)}
        {...rest}
      />
    </OverflowContext.Provider>
  );
}
