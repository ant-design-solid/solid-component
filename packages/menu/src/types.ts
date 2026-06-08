import { MotionOwnProps } from "@solid-component/motion";
import { ValueOf } from "@solid-primitive/utils";
import { ComponentProps, JSX } from "solid-js";
import { Portal } from "solid-js/web";

export type MenuKey = string | number;

export const MenuMode = {
  horizontal: "horizontal",
  vertical: "vertical",
  inline: "inline",
} as const;
export type MenuMode = ValueOf<typeof MenuMode>;

export const MenuDirection = {
  ltr: "ltr",
  rtl: "rtl",
} as const;
export type MenuDirection = ValueOf<typeof MenuDirection>;

export type MenuPopupTrigger = "click" | "hover";

export type MenuMotionConfig = Omit<MotionOwnProps, "visible" | "children">;

export interface MenuPopupOptions {
  trigger?: MenuPopupTrigger;
  class?: string | undefined;
  style?: JSX.CSSProperties | string | undefined;
  zIndex?: number;
  portal?: boolean | Omit<ComponentProps<typeof Portal>, "children">;
}

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
