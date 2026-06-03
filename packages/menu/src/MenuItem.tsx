import { FloatingTrigger } from "@solid-component/floating";
import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import { composeHandlers, error, mergeRefs } from "@solid-component/utils";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  splitProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  useMenuRootContext,
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

export default function MenuItem<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuItemProps<T>>,
) {
  const root = useMenuRootContext();
  const parentSubmenu = useMenuSubmenuContext(false);
  const inSubmenuContent = useMenuSubmenuContentContext();

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
  const key = createMemo(() => submenu()?.key() ?? local.key);
  const parentKey = createMemo(() =>
    submenu() ? submenu()?.parentKey() : parentSubmenu?.key(),
  );
  const entryId = createMemo(() => `${String(key())}-item`);
  const disabled = createMemo(
    () => root.disabled() || !!local.disabled || !!submenu()?.disabled(),
  );
  const selected = createMemo(() =>
    submenu() ? submenu()!.selected() : root.isSelected(key()!),
  );
  const active = createMemo(() => root.activeKey() === key());
  const open = createMemo(() => submenu()?.open() ?? false);

  const requireKey = () => {
    const nextKey = key();

    if (nextKey === undefined) {
      error(
        "Menu.Item requires a key unless it is the direct item of a submenu.",
        {
          package: "menu",
        },
      );
    }

    return nextKey;
  };

  createEffect(() => {
    const nextKey = requireKey();
    const nextEntryId = entryId();

    root.registerEntry({
      id: nextEntryId,
      key: nextKey,
      parentKey: parentKey(),
      disabled,
      ref,
      focus: (options?: FocusOptions) => {
        const node = ref();
        if (!node) {
          return false;
        }
        node.focus(options);
        return document.activeElement === node;
      },
    });
    onCleanup(() => root.unregisterEntry(nextEntryId));
  });

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

    root.activate(requireKey(), event);
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
    root.setActiveKey(requireKey());
  };

  const onMouseLeave: MenuItemProps["onMouseLeave"] = () => {
    const node = ref();

    if (root.activeKey() === key() && document.activeElement !== node) {
      root.setActiveKey(undefined);
    }
  };

  const onFocus: MenuItemProps["onFocus"] = (event) => {
    if (disabled()) return;
    root.setActiveKey(requireKey());
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
      root.focus({ type: "relative", fromKey: requireKey(), direction: 1 });
    } else if (event.key === keys.prev) {
      event.preventDefault();
      root.focus({ type: "relative", fromKey: requireKey(), direction: -1 });
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
      parentSubmenu.setOpen(false);
      root.focus({ type: "key", key: parentSubmenu.key() });
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <Dynamic
      component={submenu()?.isPopup() ? FloatingTrigger : Polymorphic}
      as="div"
      ref={mergeRefs(local.ref, setRef)}
      role="menuitem"
      tabIndex={active() ? 0 : -1}
      aria-haspopup={submenu() ? "menu" : undefined}
      aria-expanded={submenu() ? submenu()!.open() : undefined}
      aria-controls={submenu()?.id}
      aria-disabled={disabled() || undefined}
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
    </Dynamic>
  );
}
