import { PolymorphicProps } from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import {
  createMemo,
  JSX,
  mergeProps,
  splitProps,
  ValidComponent,
} from "solid-js";
import { useOverflowRootContext } from "./OverflowContext";
import { InternalItem } from "./OverflowItem";

export interface OverflowSuffixOwnProps {
  children: JSX.Element;
  style: JSX.CSSProperties | string;
}

export type OverflowSuffixProps<T extends ValidComponent = "div"> =
  Partial<OverflowSuffixOwnProps>;

const defaults = {} as const;

export const SUFFIX_ID = Symbol("overlfow-suffix");

export default function OverflowSuffix<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowSuffixProps<T>>,
) {
  const rootContext = useOverflowRootContext();
  const merged = mergeProps(defaults, props as OverflowSuffixProps);
  const [local, rest] = splitProps(merged, ["children", "style"]);
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
      recordId={SUFFIX_ID}
      role="suffix"
      show={true}
      order={rootContext.displayCount()}
      invalidate={rootContext.invalidate()}
      responsive={rootContext.responsive()}
      style={style()}
      {...rest}
    >
      {local.children}
    </InternalItem>
  );
}
