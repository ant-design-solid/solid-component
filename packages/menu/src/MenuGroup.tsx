import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import { Show, splitProps, type JSX, type ValidComponent } from "solid-js";

export interface MenuGroupOwnProps {
  label?: JSX.Element;
}

export interface MenuGroupCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "children"
> {}

export interface MenuGroupProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends MenuGroupOwnProps, MenuGroupCommonProps<ElementOf<T>> {}

export default function MenuGroup<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuGroupProps<T>>,
) {
  const [local, rest] = splitProps(props as MenuGroupProps<"div">, [
    "label",
    "children",
  ]);

  return (
    <Polymorphic<JSX.HTMLAttributes<ElementOf<T>>>
      as="div"
      role="group"
      {...rest}
    >
      <Show when={local.label}>{(label) => label()}</Show>
      {local.children}
    </Polymorphic>
  );
}
