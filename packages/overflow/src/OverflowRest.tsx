import { PolymorphicProps } from "@solid-component/polymorphic";
import { JSX, Show, ValidComponent, mergeProps, splitProps } from "solid-js";
import { useOverflowContext } from "./OverflowContext";
import { InternalItem } from "./OverflowItem";

export interface OverflowRestOwnProps {
  children: JSX.Element | ((omittedCount: number) => JSX.Element);
}

export type OverflowRestProps<T extends ValidComponent = "div"> =
  Partial<OverflowRestOwnProps>;

function defaultRenderRest(omittedCount: number) {
  return `+ ${omittedCount} ...`;
}

export const REST_UID = Symbol("overflow-rest");

const defaults = {
  children: defaultRenderRest,
} as const;
export default function OverflowRest<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowRestProps<T>>,
) {
  const { omittedCount, renderRest, invalidate, responsive, visibleRange } =
    useOverflowContext();
  const merged = mergeProps(defaults, props as OverflowRestProps);
  const [local, rest] = splitProps(merged, ["children"]);

  return (
    <Show when={renderRest()}>
      <InternalItem
        uid={REST_UID}
        role="rest"
        show={omittedCount() > 0}
        order={visibleRange()[1]}
        invalidate={invalidate()}
        responsive={responsive()}
        {...rest}
      >
        {typeof local.children === "function"
          ? local.children(omittedCount())
          : local.children}
      </InternalItem>
    </Show>
  );
}
