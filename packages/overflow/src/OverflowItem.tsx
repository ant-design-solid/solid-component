import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeRefs, mergeStyle } from "@solid-component/utils";
import { createResizeObserver } from "@solid-primitive/resize-observer";
import { makeRaf } from "@solid-primitive/scheduler";
import { ValueOf } from "@solid-primitive/utils";
import {
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  ValidComponent,
} from "solid-js";
import {
  OverflowItemContext,
  useOverflowContext,
  useOverflowItemContext,
} from "./OverflowContext";
import type { OverflowItemKey } from "./types";

export const InternalItemVisibility = {
  visible: "visible",
  measure: "measure",
  hidden: "hidden",
} as const;
export type InternalItemVisibility = ValueOf<typeof InternalItemVisibility>;

const {
  visible: VISIBLE,
  measure: MEASURE,
  hidden: HIDDEN,
} = InternalItemVisibility;

interface InternalItemOptions {
  visualOrder?: number;
  responsive?: boolean;
  visibility?: InternalItemVisibility;
  invalidate?: boolean;
  onWidthChange?: (width: number | null) => void;
}

interface InternalItemCommonProps<T = HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "children" | "ref" | "style"
> {}

export type InternalItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = InternalItemOptions & InternalItemCommonProps<ElementOf<T>>;

const defaults = {
  visibility: VISIBLE,
} as const;
export function InternalItem<T extends ValidComponent>(
  props: PolymorphicProps<T, InternalItemProps<T>>,
) {
  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, [
    "ref",
    "style",
    "visualOrder",
    "responsive",
    "visibility",
    "invalidate",
    "onWidthChange",
  ]);

  const [itemRef, setItemRef] = createSignal<HTMLElement>();

  const visibility = createMemo(() => {
    return local.invalidate ? VISIBLE : local.visibility;
  });

  const style = createMemo(() => {
    if (local.invalidate) {
      return local.style;
    }

    const style: JSX.CSSProperties = {
      order: local.responsive ? local.visualOrder : undefined,
    };
    if (visibility() === VISIBLE) {
      style["opacity"] = 1;
    } else if (visibility() === MEASURE) {
      style["opacity"] = 0;
      style["pointer-events"] = "none";
      style["position"] = "absolute";
      style["visibility"] = "hidden";
    } else {
      style["opacity"] = 0;
      style["height"] = 0;
      style["overflow-y"] = "hidden";
      style["pointer-events"] = "none";
      style["position"] = "absolute";
    }

    return mergeStyle(local.style, style);
  });

  const [raf, cancelRaf] = makeRaf();
  const targetRef = createMemo(() => (local.responsive ? itemRef() : null));
  createResizeObserver(targetRef, ([entry]) => {
    const nextWidth = (entry.target as HTMLElement).offsetWidth;
    raf(() => {
      local.onWidthChange?.(nextWidth);
    });
  });

  onMount(() => {
    const ele = targetRef();
    if (ele && ele.offsetWidth > 0) {
      local.onWidthChange?.(ele.offsetWidth);
    }
  });

  onCleanup(() => {
    local.onWidthChange?.(null);
    cancelRaf();
  });

  return (
    <Polymorphic
      as="div"
      ref={mergeRefs(local.ref, setItemRef)}
      style={style()}
      aria-hidden={visibility() !== VISIBLE}
      {...rest}
    />
  );
}

export interface OverflowItemOwnProps<
  T extends HTMLElement = HTMLElement,
> extends InternalItemCommonProps<T> {
  key?: OverflowItemKey;
  index?: number;
}

export type OverflowItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = OverflowItemOwnProps<ElementOf<T>>;

export default function OverflowItem<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowItemProps<T>>,
) {
  const [local, rest] = splitProps(props as OverflowItemProps, [
    "ref",
    "key",
    "index",
  ]);

  const {
    visibleRange,
    responsive,
    invalidate,
    measuring,
    previewRange,
    getItemOrder,
    registerItem,
    unregisterItem,
  } = useOverflowContext();
  const itemContext = useOverflowItemContext();

  const uid = Symbol("overflow-item");
  const [itemRef, setItemRef] = createSignal<HTMLElement>();
  const [width, setWidth] = createSignal<number | null>(null);
  const order = createMemo(() => getItemOrder(uid)!);
  const inVisibleRange = () => {
    const currentOrder = order();
    const [start, end] = visibleRange();
    return currentOrder >= start && currentOrder <= end;
  };
  const inPreviewRange = () => {
    const range = previewRange();
    if (!range) {
      return false;
    }

    const currentOrder = order();
    const [start, end] = range;
    return currentOrder >= start && currentOrder <= end;
  };
  const visibility = createMemo<InternalItemVisibility>(() => {
    if (responsive() && measuring()) {
      return inPreviewRange() ? VISIBLE : MEASURE;
    }

    return inVisibleRange() ? VISIBLE : HIDDEN;
  });

  const record = {
    uid,
    key: local.key ?? itemContext?.key,
    ref: itemRef,
    index: () => local.index ?? itemContext?.index(),
    width,
  };

  registerItem(record);

  onCleanup(() => {
    unregisterItem(uid);
  });

  return (
    <OverflowItemContext.Provider value={null}>
      <InternalItem
        ref={mergeRefs(local.ref, setItemRef)}
        visualOrder={order() * 2}
        visibility={visibility()}
        responsive={responsive()}
        invalidate={invalidate()}
        onWidthChange={setWidth}
        {...rest}
      />
    </OverflowItemContext.Provider>
  );
}
