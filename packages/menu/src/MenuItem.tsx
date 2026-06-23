import { FloatingTrigger } from "@solid-component/floating";
import { OverflowItem } from "@solid-component/overflow";
import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import { composeHandlers, error, mergeRefs } from "@solid-component/utils";
import {
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  Show,
  splitProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  MenuSubmenuContextValue,
  useMenuContext,
  useMenuOverflowPopupContext,
  useMenuSubmenuContentContext,
  useMenuSubmenuContext,
} from "./MenuContext";
import { getMenuArrowKeys, MENU_NAVIGATION_KEYS } from "./menu-keydown";
import {
  MenuDirection,
  MenuMode,
  type MenuItemRenderState,
  type MenuKey,
} from "./types";

export interface MenuItemOwnProps {
  key?: MenuKey;
  disabled?: boolean;
  children?: JSX.Element | ((state: MenuItemRenderState) => JSX.Element);
}

export interface MenuItemCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref" | "onClick" | "onKeyDown" | "onMouseEnter" | "onMouseLeave" | "onFocus"
> {}

export interface MenuItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends MenuItemOwnProps, MenuItemCommonProps<ElementOf<T>> {}

interface MenuItemViewProps {
  submenu?: MenuSubmenuContextValue;
  active?: boolean;
  disabled?: boolean;
  selected?: boolean;
}

function MenuItemView<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuItemViewProps>,
) {
  const [local, rest] = splitProps(props as MenuItemViewProps, [
    "submenu",
    "active",
    "selected",
    "disabled",
  ]);
  return (
    <Dynamic
      component={local.submenu?.isPopup() ? FloatingTrigger : Polymorphic}
      as="li"
      role="menuitem"
      tabIndex={local.active ? 0 : -1}
      aria-haspopup={local.submenu ? "menu" : undefined}
      aria-expanded={local.submenu?.open()}
      aria-controls={local.submenu?.id}
      aria-disabled={local.disabled || undefined}
      aria-selected={local.selected}
      {...rest}
    >
      {props.children}
    </Dynamic>
  );
}

function MenuOverflowItem<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuItemProps<T>>,
) {
  const root = useMenuContext();
  const [local, rest] = splitProps(props as MenuItemProps, [
    "ref",
    "key",
    "disabled",
    "children",
    "onClick",
    "onKeyDown",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
  ]);

  const [ref, setRef] = createSignal<HTMLElement>();
  const disabled = createMemo(() => root.disabled() || !!local.disabled);
  const selected = createMemo(() => root.isSelected(local.key!));
  const active = () => local.key != null && root.isActive(local.key);
  const open = () => false;
  const state = {
    get selected() {
      return selected();
    },
    get disabled() {
      return disabled();
    },
    get active() {
      return active();
    },
    get open() {
      return open();
    },
  };

  const activate = (event: MouseEvent | KeyboardEvent) => {
    if (disabled() || local.key === undefined) {
      return;
    }

    root.activate(local.key, event);
  };

  const onClick: MenuItemProps["onClick"] = (event) => {
    activate(event);
  };

  const onMouseEnter: MenuItemProps["onMouseEnter"] = () => {
    if (disabled() || local.key == null) return;
    root.setActiveKey(local.key);
  };

  const onMouseLeave: MenuItemProps["onMouseLeave"] = () => {
    const node = ref();

    if (
      local.key &&
      root.isActive(local.key) &&
      document.activeElement !== node
    ) {
      root.setActiveKey(undefined);
    }
  };

  const onFocus: MenuItemProps["onFocus"] = () => {
    if (disabled() || local.key === undefined) return;
    root.setActiveKey(local.key);
  };

  const onKeyDown: MenuItemProps["onKeyDown"] = (event) => {
    if (event.defaultPrevented || local.key === undefined) {
      return;
    }

    const keys = getMenuArrowKeys(
      root.mode() === MenuMode.horizontal,
      root.direction() === MenuDirection.rtl,
    );

    if (event.key === keys.next) {
      event.preventDefault();
      root.focus({ type: "relative", fromKey: local.key, direction: 1 });
    } else if (event.key === keys.prev) {
      event.preventDefault();
      root.focus({ type: "relative", fromKey: local.key, direction: -1 });
    } else if (event.key === "Home") {
      event.preventDefault();
      root.focus({ type: "first", parentKey: undefined });
    } else if (event.key === "End") {
      event.preventDefault();
      root.focus({ type: "last", parentKey: undefined });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(event);
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <MenuItemView
      ref={mergeRefs(local.ref, setRef)}
      submenu={undefined}
      active={active()}
      selected={selected()}
      disabled={disabled()}
      data-menu-key={local.key}
      onClick={composeHandlers(local.onClick, onClick)}
      onMouseEnter={composeHandlers(local.onMouseEnter, onMouseEnter)}
      onMouseLeave={composeHandlers(local.onMouseLeave, onMouseLeave)}
      onFocus={composeHandlers(local.onFocus, onFocus)}
      onKeyDown={composeHandlers(local.onKeyDown, onKeyDown)}
      {...rest}
    >
      {typeof local.children === "function"
        ? local.children(state)
        : local.children}
    </MenuItemView>
  );
}

export default function MenuItem<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuItemProps<T>>,
) {
  const root = useMenuContext();
  const parentSubmenu = useMenuSubmenuContext(false);
  const inSubmenuContent = useMenuSubmenuContentContext();
  const inOverflowPopup = useMenuOverflowPopupContext();

  const [local, rest] = splitProps(props as MenuItemProps, [
    "ref",
    "key",
    "disabled",
    "children",
    "onClick",
    "onKeyDown",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
  ]);

  const [ref, setRef] = createSignal<HTMLElement>();
  const submenu = createMemo(() =>
    parentSubmenu && !inSubmenuContent ? parentSubmenu : undefined,
  );
  const key = createMemo(() => {
    const key = submenu()?.key() ?? local.key;
    if (key == null) {
      error(
        "Menu.Item requires a key unless it is the direct item of a submenu.",
        {
          package: "menu",
        },
      );
    }
    return key;
  });
  const parentKey = createMemo(() =>
    submenu() ? submenu()?.parentKey() : parentSubmenu?.key(),
  );
  const id = createUniqueId();
  const disabled = createMemo(
    () => root.disabled() || !!local.disabled || !!submenu()?.disabled(),
  );
  const selected = createMemo(() =>
    submenu() ? submenu()!.selected() : root.isSelected(key()!),
  );
  const active = createMemo(() => root.isActive(key()));
  const open = createMemo(() => submenu()?.open() ?? false);
  const useOverflow = createMemo(
    () =>
      root.mode() === MenuMode.horizontal &&
      parentKey() === undefined &&
      !inOverflowPopup,
  );

  const renderInMore = () =>
    submenu()?.renderInMore() ?? (
      <MenuOverflowItem key={key()} disabled={local.disabled}>
        {local.children}
      </MenuOverflowItem>
    );

  const entry = {
    id,
    key,
    parentKey,
    disabled,
    ref,
    renderInMore,
  };

  if (!inOverflowPopup) {
    onCleanup(root.register(entry));
  }

  const state = createMemo<MenuItemRenderState>(() => ({
    selected: selected(),
    disabled: disabled(),
    active: active(),
    open: open(),
  }));

  const activate = (event: MouseEvent | KeyboardEvent) => {
    if (disabled()) {
      return;
    }

    root.activate(key(), event);
  };

  const onSubmenuAction = (event: MouseEvent | KeyboardEvent) => {
    const currentSubmenu = submenu();
    if (!currentSubmenu) {
      return;
    }

    root.onAction({
      key: currentSubmenu.key(),
      keyPath: root.getKeyPath(currentSubmenu.key()),
      domEvent: event,
      source: "item",
    });
  };

  const openAndFocusFirstItem = () => {
    const currentSubmenu = submenu();
    if (!currentSubmenu) {
      return;
    }

    currentSubmenu.setOpen(true);
    queueMicrotask(() => {
      root.focus({ type: "first", parentKey: currentSubmenu.key() });
    });
  };

  const onClick: MenuItemProps["onClick"] = (event) => {
    const currentSubmenu = submenu();

    if (currentSubmenu) {
      if (!disabled() && !currentSubmenu.isPopup()) {
        currentSubmenu.toggleOpen();
      }
      onSubmenuAction(event);
    } else {
      activate(event);
    }
  };

  const onMouseEnter: MenuItemProps["onMouseEnter"] = () => {
    if (disabled()) return;
    root.setActiveKey(key());
  };

  const onMouseLeave: MenuItemProps["onMouseLeave"] = () => {
    const node = ref();

    if (active() && document.activeElement !== node) {
      root.setActiveKey(undefined);
    }
  };

  const onFocus: MenuItemProps["onFocus"] = (event) => {
    if (disabled()) return;
    root.setActiveKey(key());
  };

  const onKeyDown: MenuItemProps["onKeyDown"] = (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const currentSubmenu = submenu();
    const keys = getMenuArrowKeys(
      root.mode() === MenuMode.horizontal,
      root.direction() === MenuDirection.rtl,
    );

    if (event.key === keys.next) {
      event.preventDefault();
      root.focus({ type: "relative", fromKey: key(), direction: 1 });
    } else if (event.key === keys.prev) {
      event.preventDefault();
      root.focus({ type: "relative", fromKey: key(), direction: -1 });
    } else if (event.key === "Home") {
      event.preventDefault();
      root.focus({ type: "first", parentKey: parentKey() });
    } else if (event.key === "End") {
      event.preventDefault();
      root.focus({ type: "last", parentKey: parentKey() });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (currentSubmenu) {
        if (currentSubmenu.open()) {
          currentSubmenu.toggleOpen();
        } else {
          openAndFocusFirstItem();
        }
        onSubmenuAction(event);
      } else {
        activate(event);
      }
    } else if (event.key === keys.open && currentSubmenu) {
      event.preventDefault();
      openAndFocusFirstItem();
    } else if (
      event.key === keys.close &&
      currentSubmenu &&
      currentSubmenu.depth() > 1
    ) {
      event.preventDefault();
      currentSubmenu.setOpen(false);
    } else if (event.key === keys.close && parentSubmenu) {
      event.preventDefault();
      root.focus({ type: "key", key: parentSubmenu.key() });
      parentSubmenu.setOpen(false);
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
    }
  };

  const view = () => (
    <MenuItemView
      ref={mergeRefs(local.ref, setRef)}
      submenu={submenu()}
      active={active()}
      disabled={disabled()}
      selected={selected()}
      data-menu-key={key()}
      onClick={composeHandlers(local.onClick, onClick)}
      onMouseEnter={composeHandlers(local.onMouseEnter, onMouseEnter)}
      onMouseLeave={composeHandlers(local.onMouseLeave, onMouseLeave)}
      onFocus={composeHandlers(local.onFocus, onFocus)}
      onKeyDown={composeHandlers(local.onKeyDown, onKeyDown)}
      {...rest}
    >
      {typeof local.children === "function"
        ? local.children(state())
        : local.children}
    </MenuItemView>
  );

  return (
    <Show when={useOverflow()} fallback={view()}>
      <OverflowItem key={key()}>{view()}</OverflowItem>
    </Show>
  );
}
