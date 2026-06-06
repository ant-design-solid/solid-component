import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import { Show, splitProps, type JSX, type ValidComponent } from "solid-js";

export type MenuGroupPart = "label" | "items";

export interface MenuGroupOwnProps {
  label?: JSX.Element;
  classes?: Partial<Record<MenuGroupPart, string>>;
  styles?: Partial<Record<MenuGroupPart, JSX.CSSProperties | string>>;
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
    "classes",
    "styles",
  ]);

  return (
    <Polymorphic as="li" role="presentation" {...rest}>
      <Show when={local.label}>
        <div
          class={local.classes?.label}
          style={local.styles?.label}
          role="presentation"
          title={typeof local.label === "string" ? local.label : undefined}
        >
          {local.label}
        </div>
      </Show>
      <ul role="group" class={local.classes?.items} style={local.styles?.items}>
        {local.children}
      </ul>
    </Polymorphic>
  );
}
