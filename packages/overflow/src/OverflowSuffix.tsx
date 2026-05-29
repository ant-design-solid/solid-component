import { PolymorphicProps } from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import { createMemo, JSX, splitProps, ValidComponent } from "solid-js";
import { useOverflowContext } from "./OverflowContext";
import { InternalItem } from "./OverflowItem";

export interface OverflowSuffixOwnProps {}

interface OverflowSuffixCommonProps<T> extends Pick<
  JSX.HTMLAttributes<T>,
  "style"
> {}

export interface OverflowSuffixProps<T extends ValidComponent = "div">
  extends OverflowSuffixOwnProps, OverflowSuffixCommonProps<T> {}

export const SUFFIX_UID = Symbol("overflow-suffix");

export default function OverflowSuffix<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowSuffixProps<T>>,
) {
  const rootContext = useOverflowContext();
  const [local, rest] = splitProps(props as OverflowSuffixProps, ["style"]);

  const style = createMemo(() => {
    const suffixInsetStart = rootContext.suffixInsetStart();
    if (!rootContext.responsive() || suffixInsetStart == null) {
      return local.style;
    }
    return mergeStyle(local.style, {
      position: "absolute",
      top: 0,
      left: `${suffixInsetStart}px`,
    });
  });

  return (
    <InternalItem
      uid={SUFFIX_UID}
      role="suffix"
      show={true}
      order={rootContext.visibleRange()[1]}
      invalidate={rootContext.invalidate()}
      responsive={rootContext.responsive()}
      style={style()}
      {...rest}
    />
  );
}
