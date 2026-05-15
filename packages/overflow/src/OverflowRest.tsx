import { PolymorphicProps } from "@solid-component/polymorphic";
import { JSX, Show, ValidComponent, mergeProps, splitProps } from "solid-js";
import { useOverflowRootContext } from "./OverflowContext";
import { InternalItem } from "./OverflowItem";

export interface OverflowRestOwnProps {
  children: JSX.Element | ((omittedCount: number) => JSX.Element);
}

export type OverflowRestProps<T extends ValidComponent = "div"> =
  Partial<OverflowRestOwnProps>;

function defaultRenderRest(omittedCount: number) {
  return `+ ${omittedCount} ...`;
}

const defaults = {
  children: defaultRenderRest,
} as const;

export const REST_ID = Symbol("overflow-rest");

export default function OverflowRest<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowRestProps<T>>,
) {
  const rootContext = useOverflowRootContext();
  const merged = mergeProps(defaults, props as OverflowRestProps);
  const [local, rest] = splitProps(merged, ["children"]);

  return (
    <Show when={rootContext.renderRest()}>
      <InternalItem
        recordId={REST_ID}
        role="rest"
        show={rootContext.showRest()}
        order={rootContext.displayCount()}
        invalidate={rootContext.invalidate()}
        responsive={rootContext.responsive()}
        {...rest}
      >
        {typeof local.children === "function"
          ? local.children(rootContext.omittedCount())
          : local.children}
      </InternalItem>
    </Show>
  );
}
