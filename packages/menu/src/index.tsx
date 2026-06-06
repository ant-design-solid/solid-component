import Menu from "./Menu";
import MenuDivider from "./MenuDivider";
import MenuItem from "./MenuItem";
import MenuMore from "./MenuMore";
import MenuRoot from "./MenuRoot";
import MenuSubmenu from "./MenuSubmenu";
import MenuSubmenuContent from "./MenuSubmenuContent";

const ExportMenu = Object.assign(Menu, {
  Root: MenuRoot,
  Item: MenuItem,
  More: MenuMore,
  Divider: MenuDivider,
  Submenu: MenuSubmenu,
  SubmenuContent: MenuSubmenuContent,
});

export type { MenuDividerProps } from "./MenuDivider";
export type { MenuItemOwnProps, MenuItemProps } from "./MenuItem";
export type { MenuMoreOwnProps, MenuMoreProps } from "./MenuMore";
export type {
  MenuRootElementProps,
  MenuRootOwnProps,
  MenuRootProps,
} from "./MenuRoot";
export type { MenuSubmenuOwnProps, MenuSubmenuProps } from "./MenuSubmenu";
export type {
  MenuSubmenuContentOwnProps,
  MenuSubmenuContentProps,
} from "./MenuSubmenuContent";
export type {
  MenuActionInfo,
  MenuInfo,
  MenuItemRenderState,
  MenuKey,
  MenuMode,
  SelectInfo,
} from "./types";
export {
  MenuDivider,
  MenuItem,
  MenuMore,
  MenuRoot,
  MenuSubmenu,
  MenuSubmenuContent,
};

export default ExportMenu;
