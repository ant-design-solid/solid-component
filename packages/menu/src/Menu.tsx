import { ValueOf } from "@solid-primitive/shared";
import MenuRoot, { MENU_ROOT_OWN_PROPS, MenuRootOwnProps } from "./MenuRoot";
import { Show, splitProps } from "solid-js";
import MenuMore from "./MenuMore";

interface MenuOwnProps extends Pick<
  MenuRootOwnProps,
  ValueOf<typeof MENU_ROOT_OWN_PROPS>
> {
  overflow?: boolean;
}

export interface MenuProps extends MenuOwnProps {}

export default function Menu(props: MenuProps) {
  const [rootProps, rest] = splitProps(props, MENU_ROOT_OWN_PROPS);
  return (
    <MenuRoot {...rootProps}>
      <Show when={rest.overflow}>
        <MenuMore />
      </Show>
    </MenuRoot>
  );
}
