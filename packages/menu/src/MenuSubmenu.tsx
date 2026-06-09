import { FloatingRoot, FloatingRootOwnProps } from "@solid-component/floating";
import {
  createMemo,
  createUniqueId,
  mergeProps,
  Show,
  splitProps,
  type JSX,
} from "solid-js";
import {
  MenuSubmenuContentContext,
  MenuSubmenuContext,
  useMenuContext,
  useMenuSubmenuContext,
  type MenuSubmenuContextValue,
} from "./MenuContext";
import { MENU_POPUP_PLACEMENTS, resolvePlacement } from "./placements";
import { MenuMode, MenuPopupTrigger, type MenuKey } from "./types";

export interface MenuSubmenuOwnProps {
  key: MenuKey;
  disabled?: boolean;
  trigger?: MenuPopupTrigger;
  stretch?: FloatingRootOwnProps["stretch"] | boolean;
}

interface MenuSubmenuCommonProps {
  children?: JSX.Element;
}

export interface MenuSubmenuProps
  extends MenuSubmenuOwnProps, MenuSubmenuCommonProps {}

const defaults = { disabled: false } as const;
export default function MenuSubmenu(props: MenuSubmenuProps) {
  const root = useMenuContext();
  const parentSubmenu = useMenuSubmenuContext();

  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, [
    "key",
    "disabled",
    "children",
    "trigger",
    "stretch",
  ]);

  const depth = createMemo(() =>
    parentSubmenu ? parentSubmenu.depth() + 1 : 1,
  );
  const isPopup = () => root.mode() !== MenuMode.inline;
  const disabled = createMemo(() => root.disabled() || !!local.disabled);
  const open = createMemo(() => root.isOpen(local.key));
  const selected = createMemo(() => root.hasSelectedDescendant(local.key));
  const placement = createMemo(() =>
    resolvePlacement(root.mode(), root.direction(), depth()),
  );
  const trigger = createMemo(() => local.trigger ?? root.popup().trigger);
  const stretch = createMemo(() => {
    if (typeof local.stretch === "string") return local.stretch;
    if (local.stretch) {
      return root.mode() === MenuMode.horizontal ? "minWidth" : undefined;
    }
    return undefined;
  });
  const contentId = createUniqueId();
  const renderInMore = () => <MenuSubmenu {...props} />;

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
    renderInMore,
    setOpen,
    toggleOpen: () => setOpen(!open()),
  } satisfies MenuSubmenuContextValue;

  return (
    <MenuSubmenuContext.Provider value={context}>
      <MenuSubmenuContentContext.Provider value={false}>
        <Show when={isPopup()} fallback={local.children}>
          <FloatingRoot
            open={open()}
            onOpenChange={setOpen}
            stretch={stretch()}
            action={trigger()}
            placement={placement()}
            placements={MENU_POPUP_PLACEMENTS}
            forceRender
            {...rest}
          >
            {local.children}
          </FloatingRoot>
        </Show>
      </MenuSubmenuContentContext.Provider>
    </MenuSubmenuContext.Provider>
  );
}
