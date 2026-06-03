import { FloatingRoot } from "@solid-component/floating";
import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  createMemo,
  createUniqueId,
  mergeProps,
  splitProps,
  ValidComponent,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  MenuSubmenuContentContext,
  MenuSubmenuContext,
  useMenuRootContext,
  useMenuSubmenuContext,
  type MenuSubmenuContextValue,
} from "./MenuContext";
import { MENU_POPUP_PLACEMENTS } from "./placements";
import { MenuDirection, MenuMode, type MenuKey } from "./types";

export interface MenuSubmenuOwnProps {
  key: MenuKey;
  disabled?: boolean;
}

interface MenuSubmenuCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "children"> {}

export interface MenuSubmenuProps<T extends ValidComponent>
  extends MenuSubmenuOwnProps, MenuSubmenuCommonProps<ElementOf<T>> {}

const defaults = { disabled: false } as const;
export default function MenuSubmenu<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuSubmenuProps<T>>,
) {
  const root = useMenuRootContext();
  const parentSubmenu = useMenuSubmenuContext();

  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, ["key", "disabled"]);

  const depth = createMemo(() =>
    parentSubmenu ? parentSubmenu.depth() + 1 : 1,
  );
  const isPopup = () => root.mode() !== MenuMode.inline;
  const disabled = createMemo(() => root.disabled() || !!local.disabled);
  const open = createMemo(() => root.isOpen(local.key));
  const selected = createMemo(() => root.hasSelectedDescendant(local.key));
  const contentId = createUniqueId();

  const resolvePlacement = () => {
    const rtl = root.direction() === MenuDirection.rtl;
    if (root.mode() === MenuMode.horizontal && depth() === 1) {
      return rtl ? "bottom-end" : "bottom-start";
    }
    return rtl ? "left" : "right";
  };

  const setOpen = (next: boolean) => {
    if (disabled()) {
      return;
    }

    root.setSubmenuOpen(local.key, next);
  };

  const context = {
    key: () => local.key,
    parentKey: () => parentSubmenu?.key(),
    isPopup,
    depth,
    disabled,
    open,
    selected,
    id: contentId,
    setOpen,
    toggleOpen: () => setOpen(!open()),
  } satisfies MenuSubmenuContextValue;

  return (
    <MenuSubmenuContext.Provider value={context}>
      <MenuSubmenuContentContext.Provider value={false}>
        <Dynamic
          component={
            isPopup()
              ? (floatingProps: JSX.HTMLAttributes<HTMLDivElement>) => (
                  <FloatingRoot
                    open={open()}
                    onOpenChange={setOpen}
                    action={root.submenuTrigger()}
                    placement={resolvePlacement()}
                    placements={MENU_POPUP_PLACEMENTS}
                    forceRender
                    {...floatingProps}
                  />
                )
              : Polymorphic
          }
          as="div"
          {...rest}
        />
      </MenuSubmenuContentContext.Provider>
    </MenuSubmenuContext.Provider>
  );
}
