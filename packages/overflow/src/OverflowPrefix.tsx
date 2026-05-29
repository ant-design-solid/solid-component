import { PolymorphicProps } from "@solid-component/polymorphic";
import { JSX, ValidComponent } from "solid-js";
import { useOverflowContext } from "./OverflowContext";
import { InternalItem } from "./OverflowItem";

export interface OverflowPrefixOwnProps {
  children?: JSX.Element;
}

export interface OverflowPrefixProps<
  T extends ValidComponent = "div",
> extends OverflowPrefixOwnProps {}

export const PREFIX_UID = Symbol("overflow-prefix");

export default function OverflowPrefix<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowPrefixProps<T>>,
) {
  const rootContext = useOverflowContext();

  return (
    <InternalItem
      uid={PREFIX_UID}
      role="prefix"
      show={true}
      order={-1}
      invalidate={rootContext.invalidate()}
      responsive={rootContext.responsive()}
      {...(props as OverflowPrefixProps)}
    />
  );
}
