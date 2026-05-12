import {
  Accessor,
  ComponentProps,
  createMemo,
  For,
  JSX,
  splitProps,
} from "solid-js";
import {
  OverflowItemContext,
  OverflowItemContextValue,
  useOverflowRootContext,
} from "./OverflowContext";

export interface OverflowItemsProps<T = unknown>
  extends Omit<ComponentProps<typeof For>, "children"> {
  children: (item: T, index: Accessor<number>) => JSX.Element;
}

export default function OverflowItems<T>(props: OverflowItemsProps<T>) {
  const rootContext = useOverflowRootContext();
  const [local, rest] = splitProps(props, ["children"]);

  return (
    <For {...rest}>
      {(item, index) => {
        const id = Symbol("overflow-item-context");
        const itemContext = {
          id,
          order: index,
          role: "item",
          display: () => index() <= rootContext.displayCount(),
          responsive: () => true,
          invalidate: () => false,
        } satisfies OverflowItemContextValue;
        const node = createMemo(() => local.children(item, index));

        return (
          <OverflowItemContext.Provider value={itemContext}>
            {node()}
          </OverflowItemContext.Provider>
        );
      }}
    </For>
  );
}
