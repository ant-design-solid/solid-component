import { PolymorphicProps } from "@solid-component/polymorphic";
import {
  createMemo,
  JSX,
  Show,
  ValidComponent,
  mergeProps,
  splitProps,
} from "solid-js";
import { useOverflowContext } from "./OverflowContext";
import { InternalItem, InternalItemVisibility } from "./OverflowItem";
import { OverflowChangeInfo } from "./types";

export interface OverflowRestOwnProps {
  children: JSX.Element | ((info: OverflowChangeInfo) => JSX.Element);
}

export type OverflowRestProps<T extends ValidComponent = "div"> =
  Partial<OverflowRestOwnProps>;

function defaultshowRest(info: OverflowChangeInfo) {
  return `+ ${info.omittedCount} ...`;
}

const defaults = {
  children: defaultshowRest,
} as const;
export default function OverflowRest<T extends ValidComponent>(
  props: PolymorphicProps<T, OverflowRestProps<T>>,
) {
  const {
    changeInfo,
    showRest,
    invalidate,
    responsive,
    visibleRange,
    measuring,
    collapse,
    setRestWidth,
  } = useOverflowContext();
  const merged = mergeProps(defaults, props as OverflowRestProps);
  const [local, rest] = splitProps(merged, ["children"]);

  const visibility = () =>
    measuring()
      ? InternalItemVisibility.measure
      : changeInfo().omittedCount > 0
        ? InternalItemVisibility.visible
        : InternalItemVisibility.hidden;

  const visualOrder = createMemo(() => {
    const [start, end] = visibleRange();
    if (end < start) {
      return collapse() === "start" ? start * 2 - 1 : 1;
    }
    return collapse() === "start" ? start * 2 - 1 : end * 2 + 1;
  });

  return (
    <Show when={showRest()}>
      <InternalItem
        visibility={visibility()}
        visualOrder={visualOrder()}
        invalidate={invalidate()}
        responsive={responsive()}
        onWidthChange={setRestWidth}
        {...rest}
      >
        {typeof local.children === "function"
          ? local.children(changeInfo())
          : local.children}
      </InternalItem>
    </Show>
  );
}
