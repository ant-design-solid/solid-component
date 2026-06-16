import { FloatingPopup } from "@solid-component/floating";
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
  useMenuContext,
  useMenuSubmenuContext,
} from "./MenuContext";
import { MenuMotionConfig } from "./types";

export interface MenuSubmenuContentOwnProps {
  motion?: MenuMotionConfig;
}

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
  props: PolymorphicProps<T, MenuSubmenuContentOwnProps>,
) {
  const { motion: rootMotion } = useMenuContext();
  const { open } = useMenuSubmenuContext(true);
  const [local, rest] = splitProps(props as MenuSubmenuContentOwnProps, [
    "motion",
  ]);
  const motion = () => local.motion ?? rootMotion();

  return (
    <Motion visible={open()} {...motion()}>
      <Polymorphic
        as="ul"
        role="menu"
        tabIndex={-1}
        aria-hidden={!open()}
        hidden={!open()}
        {...rest}
      />
    </Motion>
  );
}

interface MenuPopupContentProps
  extends
    MenuSubmenuContentOwnProps,
    Pick<JSX.HTMLAttributes<HTMLElement>, "class" | "style" | "children"> {}

export function MenuPopupContent(props: MenuPopupContentProps) {
  const { popup, motion } = useMenuContext();
  const [local, rest] = splitProps(props, ["motion", "style", "class"]);
  const className = () =>
    [popup().class, local.class].filter(Boolean).join(" ") || undefined;

  return (
    <FloatingPopup
      as="ul"
      role="menu"
      tabIndex={-1}
      motion={local.motion ?? motion()}
      zIndex={popup().zIndex}
      style={mergeStyle(popup().style, local.style)}
      class={className()}
      portal={popup().portal}
      {...rest}
    />
  );
}

export default function MenuSubmenuContent<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuSubmenuContentProps<T>>,
) {
  const { id, isPopup } = useMenuSubmenuContext(true);

  return (
    <MenuSubmenuContentContext.Provider value={true}>
      <Dynamic
        component={isPopup() ? MenuPopupContent : InternalInlineContent}
        id={id}
        {...props}
      />
    </MenuSubmenuContentContext.Provider>
  );
}
