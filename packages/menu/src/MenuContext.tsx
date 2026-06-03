import { error } from "@solid-component/utils";
import { createContext, useContext, type Accessor } from "solid-js";
import type {
  MenuActionInfo,
  MenuDirection,
  MenuKey,
  MenuMode,
  MenuSubmenuTrigger,
} from "./types";

export interface MenuFocusRequest {
  type: "first" | "last" | "key" | "relative";
  parentKey?: MenuKey;
  key?: MenuKey;
  fromKey?: MenuKey;
  direction?: 1 | -1;
}

export interface MenuEntry {
  id: string;
  key: MenuKey;
  parentKey: MenuKey | undefined;
  disabled: Accessor<boolean>;
  ref: Accessor<HTMLElement | undefined>;
  focus: (options?: FocusOptions) => boolean;
}

export interface MenuSubmenuContextValue {
  id: string;
  key: Accessor<MenuKey>;
  parentKey: Accessor<MenuKey | undefined>;
  isPopup: Accessor<boolean>;
  depth: Accessor<number>;
  disabled: Accessor<boolean>;
  open: Accessor<boolean>;
  selected: Accessor<boolean>;
  setOpen: (next: boolean) => void;
  toggleOpen: () => void;
}

export interface MenuRootContextValue {
  mode: Accessor<MenuMode>;
  direction: Accessor<MenuDirection>;
  disabled: Accessor<boolean>;
  selectable: Accessor<boolean>;
  multiple: Accessor<boolean>;
  loop: Accessor<boolean>;

  submenuTrigger: Accessor<MenuSubmenuTrigger>;
  selectedKeys: Accessor<MenuKey[]>;
  openKeys: Accessor<MenuKey[]>;
  activeKey: Accessor<MenuKey | undefined>;
  setActiveKey: (key: MenuKey | undefined) => void;
  registerEntry: (entry: MenuEntry) => void;
  unregisterEntry: (id: string) => void;
  focus: (request: MenuFocusRequest) => boolean;
  getKeyPath: (key: MenuKey) => MenuKey[];
  isSelected: (key: MenuKey) => boolean;
  isOpen: (key: MenuKey) => boolean;
  hasSelectedDescendant: (key: MenuKey) => boolean;
  setSubmenuOpen: (key: MenuKey, open: boolean) => void;
  activate: (key: MenuKey, domEvent: MouseEvent | KeyboardEvent) => void;
  onAction: (info: MenuActionInfo) => void;
}

export const MenuRootContext = createContext<MenuRootContextValue>();
export const MenuSubmenuContext = createContext<MenuSubmenuContextValue>();
export const MenuSubmenuContentContext = createContext(false);

export function useMenuRootContext() {
  const context = useContext(MenuRootContext);

  if (!context) {
    error("Menu components must be used within <Menu.Root>.", {
      package: "menu",
    });
  }

  return context;
}

export function useMenuSubmenuContext<T extends false | true>(
  force?: T,
): T extends true
  ? MenuSubmenuContextValue
  : MenuSubmenuContextValue | undefined {
  const context = useContext(MenuSubmenuContext);

  if (force && !context) {
    error("Menu trigger/content must be used within <Menu.Submenu>.", {
      package: "menu",
    });
  }

  return context!;
}

export function useMenuSubmenuContentContext() {
  return useContext(MenuSubmenuContentContext);
}
