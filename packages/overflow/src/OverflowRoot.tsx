import { mergeRefs } from "@s-components/utils";
import Polymorphic, { ElementOf } from "@s-components/polymorphic";
import { MaybeElement } from "@s-primitives/shared";
import { createResizeObserver } from "@s-primitives/web";
import { createSignal, mergeProps, splitProps, ValidComponent } from "solid-js";

export interface OverflowRootOptions {}

export interface OverflowRootCommonProps<T extends HTMLElement = HTMLElement> {
  ref: T | ((el: T) => void);
}

export interface OverflowRootRenderProps extends OverflowRootCommonProps {}

export type OverflowRootProps<T extends ValidComponent | HTMLElement = HTMLElement> =
  OverflowRootOptions & Partial<OverflowRootCommonProps<ElementOf<T>>>;

const defaults = {
  as: "div",
} as const;

export default function OverflowRoot(props: OverflowRootProps) {
  const merged = mergeProps(props, defaults);
  const [local, rest] = splitProps(merged, ["as", "ref"]);

  const [rootRef, setRootRef] = createSignal<MaybeElement>();
  createResizeObserver(rootRef, () => {});

  return (
    <Polymorphic<OverflowRootRenderProps>
      as={local.as}
      ref={mergeRefs(local.ref, setRootRef)}
      {...rest}
    />
  );
}
