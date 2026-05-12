import { JSX, Show, ValidComponent, createMemo, mergeProps, splitProps } from "solid-js";
import { useOverflowRootContext } from "./OverflowContext";
import { InternalItem, InternalItemProps } from "./OverflowItem";
import { ElementOf } from "@s-components/polymorphic";

export type OverflowRestCommonProps<T extends ValidComponent> = InternalItemProps<T> & {
  children: JSX.Element | ((omittedCount: number) => JSX.Element);
};

export type OverflowRestProps<T extends ValidComponent | HTMLElement = HTMLElement> = Partial<
  OverflowRestCommonProps<ElementOf<T>>
>;

function defaultRenderRest(omittedCount: number) {
  return `+ ${omittedCount} ...`;
}

const defaults = {
  children: defaultRenderRest,
} as const;

export default function OverflowRest<T extends ValidComponent>(props: OverflowRestProps<T>) {
  const rootContext = useOverflowRootContext();
  const merged = mergeProps(defaults, props as OverflowRestProps);
  const [local, rest] = splitProps(merged, ["children"]);

  const omittedCount = createMemo(() => rootContext.omittedCount());
  const display = createMemo(() => rootContext.restReady() && omittedCount() > 0);
  const order = createMemo(() => rootContext.displayCount());

  return (
    <Show when={rootContext.items().length > 0}>
      <InternalItem
        role="rest"
        display={display}
        order={order}
        itemKey={"__overflow-rest__"}
        {...rest}
      >
        {typeof local.children === "function" ? local.children(omittedCount()) : local.children}
      </InternalItem>
    </Show>
  );
}
