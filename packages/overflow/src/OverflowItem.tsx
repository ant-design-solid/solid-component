import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@s-components/polymorphic";
import { mergeRefs, mergeStyle } from "@s-components/utils";
import { access, Optional } from "@s-primitives/shared";
import { createResizeObserver } from "@s-primitives/web";
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
  OverflowItemId,
  OverflowItemKey,
  OverflowItemRole,
  useOverflowItemContext,
  useOverflowRootContext,
} from "./OverflowContext";

interface InternalItemOptions {
  recordId: OverflowItemId;

  itemKey?: OverflowItemKey;
  order: number;
  role?: OverflowItemRole;
  responsive?: boolean;
  show?: boolean;
  invalidate?: boolean;
}

interface InternalItemCommonProps<T = HTMLElement> {
  ref: T | ((el: T) => void);
  style: JSX.CSSProperties | string;
  children: JSX.Element;
  "aria-hidden"?: boolean;
}

export type InternalItemProps<T extends ValidComponent> = InternalItemOptions &
  Partial<InternalItemCommonProps<ElementOf<T>>>;

export function InternalItem<T extends ValidComponent>(
  props: PolymorphicProps<T, InternalItemProps<T>>,
) {
  const rootContext = useOverflowRootContext();
  const merged = mergeProps({ role: "item" }, props);
  const [local, rest] = splitProps(merged, [
    "recordId",
    "order",
    "itemKey",
    "role",
    "ref",
    "style",
    "responsive",
    "show",
    "invalidate",
    "children",
  ]);

  const [itemRef, setItemRef] = createSignal<HTMLElement>();
  const [width, setWidth] = createSignal<number | null>(null);

  const show = createMemo(() => !local.responsive || local.show);

  const visualOrder = createMemo(() => {
    if (!local.responsive) {
      return undefined;
    }

    if (local.role === "item") {
      return local.order * 2;
    }

    const [start, end] = rootContext.visibleRange();

    if (local.role === "rest") {
      if (end < start) {
        return rootContext.collapse() === "start" ? start * 2 - 1 : 1;
      }
      return rootContext.collapse() === "start" ? start * 2 - 1 : end * 2 + 1;
    }

    if (local.role === "suffix") {
      if (end < start) {
        return rootContext.collapse() === "start" ? start * 2 : 2;
      }
      return rootContext.displayCount() * 2 + 2;
    }

    return local.order;
  });
  const style = createMemo(() => {
    if (local.invalidate) {
      return local.style;
    }

    const style: JSX.CSSProperties = {
      order: visualOrder(),
    };
    if (show()) {
      style["opacity"] = 1;
    } else {
      style["opacity"] = 0;
      style["height"] = 0;
      style["overflow-y"] = "hidden";
      style["pointer-events"] = "none";
      style["position"] = "absolute";
    }

    return mergeStyle(local.style, style);
  });

  const record = {
    id: local.recordId,
    key: local.itemKey,
    role: local.role,
    el: itemRef,
    order: createMemo(() => local.order),
    width,
  };

  rootContext.registerItem(record);

  const targetRef = createMemo(() => (local.responsive ? itemRef() : null));
  createResizeObserver(targetRef, ([entry]) => {
    const nextWidth = (entry.target as HTMLElement).offsetWidth;
    rootContext.batcher.enqueue(() => {
      setWidth(nextWidth);
    });
  });

  onMount(() => {
    const ele = targetRef();
    if (ele && ele.offsetWidth > 0) {
      setWidth(ele.offsetWidth);
    }
  });

  onCleanup(() => {
    rootContext.unregisterItem(local.recordId);
  });

  return (
    <Polymorphic
      ref={mergeRefs(local.ref, setItemRef)}
      style={style()}
      aria-hidden={!show()}
      {...rest}
    >
      {local.children}
    </Polymorphic>
  );
}

export interface OverflowItemOwnProps<T extends HTMLElement = HTMLElement>
  extends
    Partial<InternalItemCommonProps<T>>,
    Optional<
      Omit<InternalItemOptions, "responsive" | "invalidate" | "recordId">,
      "order"
    > {}

export type OverflowItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = OverflowItemOwnProps<ElementOf<T>>;

const defaults = {
  as: "div",
} as const;

export default function OverflowItem<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowItemProps<T>>,
) {
  const merged = mergeProps(props, defaults);
  const [local, rest] = splitProps(merged, [
    "as",
    "ref",
    "itemKey",
    "order",
    "role",
    "style",
  ]);

  const rootContext = useOverflowRootContext();
  const itemContext = useOverflowItemContext();
  const id = itemContext?.id || Symbol(`overflow-${local.role}`);
  const order = createMemo(() => {
    return access(local.order) ?? itemContext?.order() ?? 0;
  });

  return (
    <OverflowItemContext.Provider value={null}>
      <InternalItem
        as={local.as}
        ref={local.ref}
        recordId={id}
        itemKey={local.itemKey ?? itemContext?.itemKey}
        order={order()}
        role={local.role ?? itemContext?.role}
        show={itemContext?.show()}
        responsive={rootContext.responsive()}
        invalidate={rootContext.invalidate()}
        {...rest}
      />
    </OverflowItemContext.Provider>
  );
}
