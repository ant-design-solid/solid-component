import { FloatingPopup, FloatingPopupProps } from "@solid-component/floating";
import Motion from "@solid-component/motion";
import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import { splitProps, type JSX, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  MenuSubmenuContentContext,
  useMenuSubmenuContext,
} from "./MenuContext";

export interface MenuSubmenuContentOwnProps extends Pick<
  FloatingPopupProps,
  "motion"
> {}

export interface MenuSubmenuContentCommonProps<
  T extends HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "style"> {}

export interface MenuSubmenuContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends
    MenuSubmenuContentOwnProps,
    MenuSubmenuContentCommonProps<ElementOf<T>> {}

function InternalInlineContent<T extends ValidComponent>(
  props: PolymorphicProps<T, Pick<FloatingPopupProps, "motion">>,
) {
  const submenu = useMenuSubmenuContext(true);
  const [local, rest] = splitProps(props, ["motion"]);

  return (
    <Motion visible={submenu.open()} {...local.motion}>
      <Polymorphic {...rest} />
    </Motion>
  );
}

export default function MenuSubmenuContent<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuSubmenuContentProps<T>>,
) {
  const submenu = useMenuSubmenuContext(true);
  const [local, rest] = splitProps(props as MenuSubmenuContentProps, ["style"]);

  return (
    <MenuSubmenuContentContext.Provider value={true}>
      <Dynamic
        component={submenu.isPopup() ? FloatingPopup : InternalInlineContent}
        as="div"
        id={submenu.id}
        role="menu"
        tabIndex={-1}
        aria-hidden={!submenu.open()}
        style={
          submenu.isPopup()
            ? mergeStyle({ position: "fixed" }, local.style)
            : local.style
        }
        hidden={!submenu.open() && !submenu.isPopup()}
        {...rest}
      />
    </MenuSubmenuContentContext.Provider>
  );
}
