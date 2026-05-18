import { PolymorphicProps } from "@solid-component/polymorphic";
import { JSX, mergeProps, splitProps, ValidComponent } from "solid-js";
import { useOverflowContext } from "./OverflowContext";
import { InternalItem } from "./OverflowItem";

export interface OverflowPrefixOwnProps {
  children: JSX.Element;
}

export type OverflowPrefixProps<T extends ValidComponent = "div"> =
  Partial<OverflowPrefixOwnProps>;

const defaults = {} as const;

export const PREFIX_ID = Symbol("overlfow-prefix");

export default function OverflowPrefix<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowPrefixProps<T>>,
) {
  const rootContext = useOverflowContext();
  const merged = mergeProps(defaults, props as OverflowPrefixProps);
  const [local, rest] = splitProps(merged, ["children"]);

  return (
    <InternalItem
      recordId={PREFIX_ID}
      role="prefix"
      show={true}
      order={-1}
      invalidate={rootContext.invalidate()}
      responsive={rootContext.responsive()}
      {...rest}
    >
      {local.children}
    </InternalItem>
  );
}
