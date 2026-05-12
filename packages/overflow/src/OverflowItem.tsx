import Polymorphic, { ElementOf, PolymorphicProps } from "@s-components/polymorphic";
import { MaybeAccessor, mergeRefs, mergeStyle } from "@s-components/utils";
import { access, MaybeElement } from "@s-primitives/shared";
import { createResizeObserver } from "@s-primitives/web";
import {
  Accessor,
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  onCleanup,
  splitProps,
  ValidComponent,
} from "solid-js";
import {
  OverflowItemKey,
  OverflowItemRole,
  useOverflowItemContext,
  useOverflowRootContext,
} from "./OverflowContext";

interface InternalItemCommonProps<T> {
  ref?: T | ((el: T) => void);
  itemKey?: OverflowItemKey;
  order: Accessor<number>;
  role?: OverflowItemRole;
}

export type InternalItemProps<T extends ValidComponent> = InternalItemCommonProps<ElementOf<T>>;

export function InternalItem<T extends ValidComponent>(
  props: PolymorphicProps<T, InternalItemProps<T>>,
) {
  const rootContext = useOverflowRootContext();
  const [local, rest] = splitProps(props, ["order", "itemKey", "role", "ref"]);

  const [itemRef, setItemRef] = createSignal<MaybeElement>();
  const [width, setWidth] = createSignal<number | null>(null);
  const id = Symbol("overflow-item");

  rootContext.registerItem({
    id,
    key: local.itemKey,
    role: local.role,
    el: itemRef,
    order: local.order,
    width,
  });

  createResizeObserver(itemRef, ([entry]) => {
    const nextWidth = (entry.target as HTMLElement).offsetWidth;
    setWidth(nextWidth);

    if (local.role === "rest") {
      rootContext.setRestWidth(nextWidth);
    }
  });

  onCleanup(() => {
    if (local.role === "rest") {
      rootContext.setRestWidth(null);
    }
    rootContext.unregisterItem(id);
  });

  return <Polymorphic ref={mergeRefs(local.ref, setItemRef)} {...rest} />;
}

export interface OverflowItemCommonProps<T extends HTMLElement = HTMLElement> extends Omit<
  InternalItemCommonProps<T>,
  "order"
> {
  order: MaybeAccessor<number>;
  itemKey: OverflowItemKey;
  display: MaybeAccessor<boolean>;
  style: JSX.CSSProperties | string;
}

export interface OverflowItemRenderProps extends OverflowItemCommonProps {}

export type OverflowItemProps<T extends ValidComponent | HTMLElement = HTMLElement> = Partial<
  OverflowItemCommonProps<ElementOf<T>>
>;

const defaults = {
  as: "div",
} as const;

export default function OverflowItem<T extends ValidComponent | HTMLElement>(
  props: OverflowItemProps<T>,
) {
  const merged = mergeProps(props, defaults);
  const [local, rest] = splitProps(merged, [
    "as",
    "ref",
    "itemKey",
    "order",
    "role",
    "display",
    "style",
  ]);

  const itemContext = useOverflowItemContext();
  const order = createMemo(() => {
    const localOrder = access(local.order);
    return localOrder ?? itemContext?.order() ?? 0;
  });
  const display = createMemo(() => {
    const localDisplay = access(local.display);
    return localDisplay ?? itemContext?.display() ?? true;
  });
  const style = createMemo(() => {
    if (display()) {
      return local.style;
    }

    return mergeStyle(local.style, {
      opacity: 0,
      height: 0,
      overflow: "hidden",
      "pointer-events": "none",
      position: "absolute",
    });
  });

  return (
    <InternalItem
      as={local.as}
      ref={local.ref}
      itemKey={local.itemKey}
      order={order}
      role={local.role ?? itemContext?.role}
      style={style()}
      aria-hidden={display() ? undefined : true}
      {...rest}
    />
  );
}
