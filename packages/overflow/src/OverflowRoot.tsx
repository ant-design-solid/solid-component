import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { createOrderedRegistry, mergeRefs } from "@solid-component/utils";
import { createResizeObserver } from "@solid-primitive/resize-observer";
import { makeRaf } from "@solid-primitive/scheduler";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  onCleanup,
  splitProps,
  ValidComponent,
} from "solid-js";
import { OverflowContext, OverflowContextValue } from "./OverflowContext";
import type {
  OverflowChangeInfo,
  OverflowCollapse,
  OverflowItemKey,
  OverflowItemRecord,
  OverflowVisibleRange,
} from "./types";

const RESPONSIVE = "responsive" as const;
const INVALIDATE = "invalidate" as const;

export type OverflowPreview =
  | { count: number; itemWidth?: never }
  | { itemWidth: number; count?: never };

export interface OverflowRootOwnProps {
  maxCount?: number | typeof RESPONSIVE | typeof INVALIDATE;
  collapse?: OverflowCollapse;
  preview?: OverflowPreview;
  onOverflowChange?: (info: OverflowChangeInfo) => void;
}

interface OverflowRootCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref"
> {}

export interface OverflowRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends OverflowRootOwnProps, OverflowRootCommonProps<ElementOf<T>> {}

function valuesEqual(a: readonly any[], b: readonly any[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const defaults = {
  collapse: "end",
} as const;
export default function OverflowRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowRootProps<T>>,
) {
  const merged = mergeProps(defaults, props as OverflowRootProps);
  const [local, rest] = splitProps(merged, [
    "ref",
    "maxCount",
    "collapse",
    "preview",
    "onOverflowChange",
  ]);
  const [containerWidth, setContainerWidth] = createSignal<number>();
  const [rootRef, setRootRef] = createSignal<HTMLElement>();
  const { register, unregister, ordered, getOrder } =
    createOrderedRegistry<OverflowItemRecord>({
      rootRef,
      package: "overflow",
    });

  const [sourceCountOverride, setSourceCountOverride] = createSignal<
    number | null
  >(null);
  const [ready, setReady] = createSignal(false);
  const [measuredOnce, setMeasuredOnce] = createSignal(false);
  const [visibleRange, setVisibleRange] = createSignal<OverflowVisibleRange>([
    0, 0,
  ]);
  const [suffixInsetStart, setSuffixInsetStart] = createSignal<number | null>(
    null,
  );
  const [prefixWidth, setPrefixWidth] = createSignal<number | null>(null);
  const [restWidth, setRestWidth] = createSignal<number | null>(null);
  const [suffixWidth, setSuffixWidth] = createSignal<number | null>(null);

  const sourceCount = createMemo(
    () => sourceCountOverride() ?? ordered().length,
  );

  const isResponsive = createMemo(() => local.maxCount === RESPONSIVE);
  const shouldResponsive = createMemo(
    () => ordered().length > 0 && isResponsive(),
  );
  const isInvalidate = createMemo(() => local.maxCount === INVALIDATE);
  const collapse = createMemo(() => local.collapse);
  const isStartCollapse = () => collapse() === "start";
  const showRest = createMemo(
    () =>
      isResponsive() ||
      (typeof local.maxCount === "number" && sourceCount() > local.maxCount),
  );
  const effectiveRestWidth = createMemo(() =>
    showRest() ? (restWidth() ?? 0) : 0,
  );
  const measuring = createMemo(() => !ready() && !measuredOnce());
  const previewCount = createMemo(() => {
    if (!isResponsive()) {
      return null;
    }

    const preview = local.preview;

    if (!preview) {
      return null;
    }

    if (preview.count != null) {
      return Math.max(1, Math.floor(preview.count));
    }

    const container = containerWidth();
    if (preview.itemWidth <= 0 || !container) {
      return null;
    }

    return Math.max(1, Math.floor(container / preview.itemWidth));
  });
  const previewRange = createMemo<OverflowVisibleRange | null>(() => {
    if (!measuring()) {
      return null;
    }

    const count = previewCount();
    const items = ordered();

    if (count == null || !items.length) {
      return null;
    }

    const lastIndex = items.length - 1;
    const firstOrder = getOrder(items[0])!;
    const lastOrder = getOrder(items[lastIndex])!;

    if (count >= items.length) {
      return [firstOrder, lastOrder];
    }

    if (isStartCollapse()) {
      return [getOrder(items[items.length - count])!, lastOrder];
    }

    return [firstOrder, getOrder(items[count - 1])!];
  });
  const isReady = createMemo(
    () =>
      ordered().every((record) => record.width() != null) &&
      (!showRest() || restWidth() != null),
  );

  createEffect(() => {
    if (ready() && (!isResponsive() || ordered().length > 0)) {
      setMeasuredOnce(true);
    }
  });

  const [raf, cancelRaf] = makeRaf();
  createResizeObserver(
    () => (isInvalidate() ? undefined : rootRef()),
    ([entry]) => {
      const { clientWidth } = entry.target;
      raf(() => {
        setContainerWidth(clientWidth);
      });
    },
  );

  onCleanup(cancelRaf);

  createEffect(() => {
    const el = rootRef();
    el && setContainerWidth(el.clientWidth);
  });

  const shouldExpand = createMemo(() => {
    if (!shouldResponsive()) {
      return false;
    }

    const items = ordered();
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

    if (isStartCollapse()) {
      return start <= getOrder(items[0])!;
    }

    return end >= getOrder(items[items.length - 1])!;
  });

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

  const changeInfo = createMemo<OverflowChangeInfo>(() => {
    const [start, end] = visibleRange();
    const visibleKeys: OverflowItemKey[] = [];
    const omittedKeys: OverflowItemKey[] = [];

    for (const item of ordered()) {
      const itemKey = item.key;

      if (itemKey === undefined) {
        continue;
      }

      const order = getOrder(item)!;
      if (order >= start && order <= end) {
        visibleKeys.push(itemKey);
      } else {
        omittedKeys.push(itemKey);
      }
    }

    return {
      visibleKeys,
      omittedKeys,
      omittedCount: Math.max(sourceCount() - Math.max(end - start + 1, 0), 0),
    };
  });

  let previousOverflowChange: OverflowChangeInfo | undefined;
  createEffect(() => {
    if (!ready()) {
      return;
    }

    const next = changeInfo();

    if (
      previousOverflowChange &&
      valuesEqual(previousOverflowChange.visibleKeys, next.visibleKeys) &&
      valuesEqual(previousOverflowChange.omittedKeys, next.omittedKeys)
    ) {
      return;
    }

    previousOverflowChange = next;
    local.onOverflowChange?.(next);
  });

  createEffect(() => {
    const container = containerWidth();
    const rest = effectiveRestWidth();
    const prefix = prefixWidth() ?? 0;
    const suffix = suffixWidth() ?? 0;
    const currentItems = ordered();
    const columnGap = getInlineGap();
    const hasMeasured = measuredOnce();

    setSuffixInsetStart(null);

    const len = currentItems.length;
    if (!len) {
      setReady(true);
      setVisibleRange([0, -1]);
      return;
    }

    if (!isResponsive()) {
      setReady(true);
      const lastIndex = len - 1;
      const firstOrder = getOrder(currentItems[0])!;
      const lastOrder = getOrder(currentItems[lastIndex])!;

      if (typeof local.maxCount !== "number") {
        setVisibleRange([firstOrder, lastOrder]);
        return;
      }

      const visibleCount = Math.max(0, Math.min(local.maxCount, len));

      if (visibleCount === 0) {
        setVisibleRange([firstOrder, firstOrder - 1]);
        return;
      }

      if (isStartCollapse()) {
        const startOrder = getOrder(currentItems[len - visibleCount])!;
        setVisibleRange([startOrder, lastOrder]);
        return;
      }

      const endOrder = getOrder(currentItems[visibleCount - 1])!;
      setVisibleRange([firstOrder, endOrder]);
      return;
    }

    if (!container) {
      setReady(false);
      return;
    }

    const lastIndex = len - 1;
    const firstRecord = currentItems[0];
    const lastRecord = currentItems[lastIndex];
    const firstOrder = getOrder(firstRecord)!;
    const lastOrder = getOrder(lastRecord)!;

    if (!isReady()) {
      setReady(false);
      if (!hasMeasured) {
        setVisibleRange([firstOrder, lastOrder]);
      }
      return;
    }

    if (shouldExpand()) {
      setReady(false);
      if (!hasMeasured) {
        setVisibleRange([firstOrder, lastOrder]);
      }
      return;
    }

    setReady(true);

    const firstWidth = firstRecord.width();
    const lastWidth = lastRecord.width();
    const prefixCount = prefixWidth() != null ? 1 : 0;
    const suffixCount = suffixWidth() != null ? 1 : 0;
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
      if (isStartCollapse()) {
        for (let index = lastIndex; index >= 0; index -= 1) {
          const width = currentItems[index].width();

          if (width == null) {
            setVisibleRange([firstOrder, lastOrder]);
            return;
          }

          totalWidth += width;
          const visibleCount = lastIndex - index + 1;

          if (
            (lastIndex === 0 && allItemsFit(totalWidth)) ||
            (index === 1 &&
              firstWidth != null &&
              allItemsFit(totalWidth + firstWidth))
          ) {
            setVisibleRange([firstOrder, lastOrder]);
            break;
          }

          if (overflowsWithRest(totalWidth, visibleCount)) {
            const nextStart = Math.min(index + 1, lastIndex);
            setVisibleRange([getOrder(currentItems[nextStart])!, lastOrder]);
            break;
          }
        }
      } else {
        for (let index = 0; index < len; index += 1) {
          const width = currentItems[index].width();

          if (width == null) {
            setVisibleRange([firstOrder, lastOrder]);
            return;
          }

          totalWidth += width;
          const visibleCount = index + 1;

          if (
            (lastIndex === 0 && allItemsFit(totalWidth)) ||
            (index === lastIndex - 1 &&
              lastWidth != null &&
              allItemsFit(totalWidth + lastWidth))
          ) {
            setVisibleRange([firstOrder, lastOrder]);
            break;
          }

          if (overflowsWithRest(totalWidth, visibleCount)) {
            const nextEnd = index - 1;
            const nextVisibleCount = Math.max(nextEnd + 1, 0);
            const visibleWidth = Math.max(totalWidth - width - fixedWidth, 0);
            const elementsBeforeSuffix = prefixCount + nextVisibleCount + 1;
            setVisibleRange([
              firstOrder,
              nextEnd >= 0 ? getOrder(currentItems[nextEnd])! : firstOrder - 1,
            ]);
            setSuffixInsetStart(
              prefix + visibleWidth + rest + columnGap * elementsBeforeSuffix,
            );
            break;
          }
        }
      }
      if (
        suffixWidth() != null &&
        firstWidth != null &&
        firstWidth + suffix > container
      ) {
        setSuffixInsetStart(null);
      }
    });
  });

  const context = {
    responsive: isResponsive,
    invalidate: isInvalidate,
    measuring,
    collapse,

    showRest,
    shouldExpand,
    previewCount,
    previewRange,

    sourceCount,
    setSourceCount,

    visibleRange,
    changeInfo,

    suffixInsetStart,
    setPrefixWidth,
    setRestWidth,
    setSuffixWidth,

    register: (entry) => {
      register(entry);
      return () => unregister(entry.id);
    },

    getItemOrder: getOrder,
  } satisfies OverflowContextValue;

  return (
    <OverflowContext.Provider value={context}>
      <Polymorphic as="div" ref={mergeRefs(local.ref, setRootRef)} {...rest} />
    </OverflowContext.Provider>
  );
}
