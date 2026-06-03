import { ValueOf } from "@solid-primitive/shared";

export type MenuKey = string | number;

export const MenuMode = {
  horizontal: "horizontal",
  vertical: "vertical",
  inline: "inline",
} as const;
export type MenuMode = ValueOf<typeof MenuMode>;

export const MenuDirection = {
  ltr: 'ltr',
  rtl: 'rtl',
} as const
export type MenuDirection = ValueOf<typeof MenuDirection>

export type MenuSubmenuTrigger = "click" | "hover";

export interface MenuInfo<TEvent extends Event = MouseEvent | KeyboardEvent> {
  key: MenuKey;
  keyPath: MenuKey[];
  domEvent: TEvent;
}

export interface SelectInfo<
  TEvent extends Event = MouseEvent | KeyboardEvent,
> extends MenuInfo<TEvent> {
  selectedKeys: MenuKey[];
}

export interface MenuActionInfo<
  TEvent extends Event = MouseEvent | KeyboardEvent,
> extends MenuInfo<TEvent> {
  source: "item" | "trigger";
}

export interface MenuItemRenderState {
  selected: boolean;
  disabled: boolean;
  active: boolean;
  open: boolean;
}
