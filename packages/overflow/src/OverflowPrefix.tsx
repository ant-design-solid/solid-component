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

export default function OverflowPrefix<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowPrefixProps<T>>,
) {
  const rootContext = useOverflowContext();

  return (
    <InternalItem
      visualOrder={-1}
      invalidate={rootContext.invalidate()}
      responsive={rootContext.responsive()}
      onWidthChange={rootContext.setPrefixWidth}
      {...(props as OverflowPrefixProps)}
    />
  );
}
