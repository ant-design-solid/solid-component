import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeRefs, mergeStyle } from "@solid-component/utils";
import { access, Optional } from "@solid-primitive/shared";
import { createResizeObserver } from "@solid-primitive/web";
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
  OverflowItemKey,
  OverflowItemRole,
  OverflowItemUid,
  useOverflowContext,
  useOverflowItemContext,
} from "./OverflowContext";

interface InternalItemOptions {
  uid: OverflowItemUid;
  key?: OverflowItemKey;
  order: number;
  role?: OverflowItemRole;
  responsive?: boolean;
  show?: boolean;
  invalidate?: boolean;
}

interface InternalItemCommonProps<T = HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "children" | "ref" | "style"
> {}

export type InternalItemProps<T extends ValidComponent> = InternalItemOptions &
  InternalItemCommonProps<ElementOf<T>>;

const defaults = {
  role: "item",
} as const;
export function InternalItem<T extends ValidComponent>(
  props: PolymorphicProps<T, InternalItemProps<T>>,
) {
  const { visibleRange, collapse, unregisterItem, registerItem, batcher } =
    useOverflowContext();
  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, [
    "uid",
    "order",
    "key",
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

  const show = createMemo(() => {
    if (local.invalidate) {
      return true;
    }

    return local.show ?? true;
  });

  const visualOrder = createMemo(() => {
    if (!local.responsive) {
      return undefined;
    }

    if (local.role === "item") {
      return local.order * 2;
    }

    const [start, end] = visibleRange();

    if (local.role === "rest") {
      if (end < start) {
        return collapse() === "start" ? start * 2 - 1 : 1;
      }
      return collapse() === "start" ? start * 2 - 1 : end * 2 + 1;
    }

    if (local.role === "suffix") {
      if (end < start) {
        return collapse() === "start" ? start * 2 : 2;
      }
      return end * 2 + 2;
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
    uid: local.uid,
    key: local.key,
    role: local.role,
    el: itemRef,
    order: createMemo(() => local.order),
    width,
  };

  registerItem(record);

  const targetRef = createMemo(() => (local.responsive ? itemRef() : null));
  createResizeObserver(targetRef, ([entry]) => {
    const nextWidth = (entry.target as HTMLElement).offsetWidth;
    void batcher.submit(() => {
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
    unregisterItem(local.uid);
  });

  return (
    <Polymorphic
      as="div"
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
      Omit<InternalItemOptions, "responsive" | "invalidate" | "uid" | "id">,
      "order"
    > {
  key?: OverflowItemKey;
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
    "order",
    "role",
  ]);

  const { visibleRange, responsive, invalidate } = useOverflowContext();
  const itemContext = useOverflowItemContext();

  const uid = Symbol("overflow-item");
  const order = createMemo(
    () => access(local.order) ?? itemContext?.order() ?? 0,
  );
  const show = createMemo(() => {
    const currentOrder = order();
    const [start, end] = visibleRange();
    return currentOrder >= start && currentOrder <= end;
  });

  return (
    <OverflowItemContext.Provider value={null}>
      <InternalItem
        ref={local.ref}
        uid={uid}
        key={local.key ?? itemContext?.key}
        order={order()}
        role={local.role ?? itemContext?.role}
        show={show()}
        responsive={responsive()}
        invalidate={invalidate()}
        {...rest}
      />
    </OverflowItemContext.Provider>
  );
}
