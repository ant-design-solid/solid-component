import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { callHandler } from "@solid-component/utils";
import { JSX, mergeProps, splitProps, ValidComponent } from "solid-js";
import { useFieldContext } from "./FieldContext";

export interface FieldClearOwnProps {
  disabled?: boolean;
}

interface FieldClearCommonProps<
  T extends HTMLElement = HTMLButtonElement,
> extends Pick<JSX.HTMLAttributes<T>, "onClick" | "onMouseDown" | "children"> {}

export interface FieldClearProps<
  T extends ValidComponent | HTMLElement = HTMLButtonElement,
>
  extends FieldClearOwnProps, FieldClearCommonProps<ElementOf<T>> {}

export default function FieldClear<T extends ValidComponent = "button">(
  props: PolymorphicProps<T, FieldClearProps<T>>,
) {
  const context = useFieldContext();
  const [local, rest] = splitProps(props as FieldClearProps, [
    "disabled",
    "children",
    "onClick",
    "onMouseDown",
  ]);

  const onClick: FieldClearProps["onClick"] = (e) => {
    if (local.disabled) return;
    context.clear();
    callHandler(e, local.onClick);
  };

  const onMouseDown: FieldClearProps["onMouseDown"] = (e) => {
    e.preventDefault();
    callHandler(e, local.onMouseDown);
  };

  return (
    <Polymorphic
      as="button"
      type="button"
      disabled={local.disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      {...rest}
    >
      {local.children ?? "✖"}
    </Polymorphic>
  );
}
