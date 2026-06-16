import Polymorphic, { PolymorphicProps } from "@solid-component/polymorphic";
import {
  createMemo,
  JSX,
  mergeProps,
  splitProps,
  ValidComponent,
} from "solid-js";
import { useFieldContext } from "./FieldContext";

interface FieldCountOwnProps {}

type CountFormatter = (data: {
  value: string;
  count: number;
  maxlength?: number;
}) => JSX.Element;

interface FieldCountCommonProps {
  children?: JSX.Element | CountFormatter;
}

export interface FieldCountProps
  extends FieldCountOwnProps, FieldCountCommonProps {}

const defaults = {
  children: (({ count, maxlength }) =>
    `${count}${maxlength ? ` / ${maxlength}` : ""}`) as CountFormatter,
} as const;
export default function FieldCount<T extends ValidComponent = "span">(
  props: PolymorphicProps<T, FieldCountProps>,
) {
  const merged = mergeProps(defaults, props as FieldCountProps);
  const [local, rest] = splitProps(merged, ["children"]);
  const { counter, value } = useFieldContext();
  const length = createMemo(() => counter().strategy(value()));
  const state = {
    get value() {
      return value();
    },
    get count() {
      return length();
    },
    get maxlength() {
      return counter().max;
    },
  };

  return (
    <Polymorphic as="span" {...rest}>
      {typeof local.children === "function"
        ? local.children(state)
        : local.children}
    </Polymorphic>
  );
}
