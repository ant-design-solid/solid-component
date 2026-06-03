import Menu from "./Menu";
import MenuDivider from "./MenuDivider";
import MenuGroup from "./MenuGroup";
import MenuItem from "./MenuItem";
import MenuRoot from "./MenuRoot";
import MenuSubmenu from "./MenuSubmenu";
import MenuSubmenuContent from "./MenuSubmenuContent";

const ExportMenu = Object.assign(Menu, {
  Root: MenuRoot,
  Item: MenuItem,
  Group: MenuGroup,
  Divider: MenuDivider,
  Submenu: MenuSubmenu,
  SubmenuContent: MenuSubmenuContent,
});

export type { MenuDividerProps } from "./MenuDivider";
export type { MenuGroupOwnProps, MenuGroupProps } from "./MenuGroup";
export type { MenuItemOwnProps, MenuItemProps } from "./MenuItem";
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
  MenuGroup,
  MenuItem,
  MenuRoot,
  MenuSubmenu,
  MenuSubmenuContent,
};

export default ExportMenu;
