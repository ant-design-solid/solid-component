import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  composeHandlers,
  createControllableSignal,
  warning,
} from "@solid-component/utils";
import {
  createMemo,
  createSignal,
  mergeProps,
  splitProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import {
  MenuRootContext,
  type MenuEntry,
  type MenuRootContextValue,
} from "./MenuContext";
import { getMenuArrowKeys } from "./menu-keydown";
import {
  MenuActionInfo,
  MenuDirection,
  MenuInfo,
  MenuKey,
  MenuMode,
  MenuSubmenuTrigger,
  SelectInfo,
} from "./types";

export interface MenuRootOwnProps {
  selectedKeys?: MenuKey[];
  defaultSelectedKeys?: MenuKey[];
  openKeys?: MenuKey[];
  defaultOpenKeys?: MenuKey[];
  selectable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  loop?: boolean;
  mode?: MenuMode;
  direction?: MenuDirection;
  submenuTrigger?: MenuSubmenuTrigger;
  onSelect?: (info: SelectInfo) => void;
  onDeselect?: (info: SelectInfo) => void;
  onSelectionChange?: (selectedKeys: MenuKey[], info: SelectInfo) => void;
  onOpenChange?: (openKeys: MenuKey[]) => void;
  onAction?: (info: MenuActionInfo) => void;
}

export interface MenuRootCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref" | "children" | "onKeyDown"
> {}

export interface MenuRootElementProps<
  T extends HTMLElement = HTMLElement,
> extends MenuRootCommonProps<T> {
  "aria-orientation": "horizontal" | "vertical";
  role: "menubar" | "menu";
  tabIndex: 0;
}

export interface MenuRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends MenuRootOwnProps, MenuRootCommonProps<ElementOf<T>> {}

const defaults = {
  disabled: false,
  selectable: true,
  multiple: false,
  loop: true,
  mode: MenuMode.vertical,
  direction: MenuDirection.ltr,
  submenuTrigger: "hover",
  defaultSelectedKeys: [] as MenuKey[],
  defaultOpenKeys: [] as MenuKey[],
} as const;

export default function MenuRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuRootProps<T>>,
) {
  const merged = mergeProps(defaults, props as MenuRootProps);
  const [local, rest] = splitProps(merged, [
    "selectedKeys",
    "defaultSelectedKeys",
    "openKeys",
    "defaultOpenKeys",
    "selectable",
    "multiple",
    "disabled",
    "loop",
    "mode",
    "direction",
    "submenuTrigger",
    "onSelect",
    "onDeselect",
    "onSelectionChange",
    "onOpenChange",
    "onAction",
    "onKeyDown",
  ]);
  const horizontal = () => local.mode === MenuMode.horizontal;
  const inline = () => local.mode === MenuMode.inline;

  const [selectedKeys, setSelectedKeys] = createControllableSignal<MenuKey[]>({
    value: () => local.selectedKeys,
    defaultValue: local.defaultSelectedKeys,
  });
  const [openKeys, setOpenKeys] = createControllableSignal<MenuKey[]>({
    value: () => local.openKeys,
    defaultValue: local.defaultOpenKeys,
  });
  const [activeKey, setActiveKey] = createSignal<MenuKey>();
  const [entries, setEntries] = createSignal<MenuEntry[]>([]);
  const entriesByKey = createMemo(() => {
    const next = new Map<MenuKey, MenuEntry>();

    for (const entry of entries()) {
      next.set(entry.key, entry);
    }

    return next;
  });

  const getParentKey = (key: MenuKey) => entriesByKey().get(key)?.parentKey;

  const getKeyPath = (key: MenuKey) => {
    const path: MenuKey[] = [];
    let currentKey: MenuKey | undefined = key;

    while (currentKey !== undefined) {
      path.unshift(currentKey);
      currentKey = getParentKey(currentKey);
    }

    return path;
  };

  const isDescendantOf = (key: MenuKey, ancestorKey: MenuKey) => {
    let currentKey = getParentKey(key);

    while (currentKey !== undefined) {
      if (currentKey === ancestorKey) {
        return true;
      }

      currentKey = getParentKey(currentKey);
    }

    return false;
  };

  const closeDescendants = (source: MenuKey[], key: MenuKey) =>
    source.filter(
      (openKey) => openKey !== key && !isDescendantOf(openKey, key),
    );

  const getFocusableEntries = (parentKey?: MenuKey) =>
    entries()
      .filter(
        (entry) =>
          entry.parentKey === parentKey && !entry.disabled() && !!entry.ref(),
      )
      .sort((a, b) => {
        const aNode = a.ref();
        const bNode = b.ref();

        if (!aNode || !bNode || aNode === bNode) {
          return 0;
        }

        const position = aNode.compareDocumentPosition(bNode);

        if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
          return -1;
        }

        if (position & Node.DOCUMENT_POSITION_PRECEDING) {
          return 1;
        }

        return 0;
      });

  const focusEntry = (entry: MenuEntry | undefined) => {
    if (!entry) {
      return false;
    }

    const focused = entry.focus();
    if (focused) {
      setActiveKey(entry.key);
    }
    return focused;
  };

  const focus: MenuRootContextValue["focus"] = (request) => {
    if (request.type === "key") {
      if (request.key === undefined) {
        return false;
      }

      const entry = entriesByKey().get(request.key);
      if (!entry || entry.disabled() || !entry.ref()) {
        return false;
      }

      return focusEntry(entry);
    }

    if (request.type === "first") {
      return focusEntry(getFocusableEntries(request.parentKey)[0]);
    }

    if (request.type === "last") {
      const siblings = getFocusableEntries(request.parentKey);
      return focusEntry(siblings[siblings.length - 1]);
    }

    if (request.fromKey === undefined || request.direction === undefined) {
      return false;
    }

    const currentEntry = entriesByKey().get(request.fromKey);
    const siblings = getFocusableEntries(currentEntry?.parentKey);
    const currentIndex = siblings.findIndex(
      (entry) => entry.key === request.fromKey,
    );

    if (currentIndex < 0) {
      return request.direction > 0
        ? focus({ type: "first", parentKey: currentEntry?.parentKey })
        : focus({ type: "last", parentKey: currentEntry?.parentKey });
    }

    const nextIndex = currentIndex + request.direction;
    if (!local.loop && (nextIndex < 0 || nextIndex >= siblings.length)) {
      return false;
    }

    const normalized = local.loop
      ? (nextIndex + siblings.length) % siblings.length
      : nextIndex;

    return focusEntry(siblings[normalized]);
  };

  const isEntrySelected = (key: MenuKey) =>
    selectedKeys().includes(key) ||
    selectedKeys().some((selectedKey) => isDescendantOf(selectedKey, key));

  const focusRootEntry = (direction: 1 | -1) => {
    const topLevelEntries = getFocusableEntries();
    if (!topLevelEntries.length) {
      return false;
    }

    if (
      activeKey() !== undefined &&
      topLevelEntries.some((entry) => entry.key === activeKey())
    ) {
      return focus({ type: "key", key: activeKey() });
    }

    const selectedEntry = topLevelEntries.find((entry) =>
      isEntrySelected(entry.key),
    );
    if (selectedEntry) {
      return focusEntry(selectedEntry);
    }

    return focus({
      type: direction > 0 ? "first" : "last",
      parentKey: undefined,
    });
  };

  const setSubmenuOpen: MenuRootContextValue["setSubmenuOpen"] = (
    key,
    open,
  ) => {
    const currentKeys = openKeys();
    const nextKeys = open
      ? currentKeys.includes(key)
        ? currentKeys
        : [...currentKeys, key]
      : closeDescendants(currentKeys, key);

    if (nextKeys === currentKeys) {
      return;
    }

    if (
      !open &&
      activeKey() !== undefined &&
      isDescendantOf(activeKey()!, key)
    ) {
      setActiveKey(key);
    }

    setOpenKeys(nextKeys);
    local.onOpenChange?.(nextKeys);
  };

  const activate = (key: MenuKey, domEvent: MouseEvent | KeyboardEvent) => {
    const info = {
      key,
      keyPath: getKeyPath(key),
      domEvent,
    } satisfies MenuInfo<typeof domEvent>;

    local.onAction?.({
      ...info,
      source: "item",
    });

    if (!local.selectable) {
      if (local.mode !== MenuMode.inline) {
        setOpenKeys([]);
        local.onOpenChange?.([]);
      }
      return;
    }

    const previousKeys = selectedKeys();
    const alreadySelected = previousKeys.includes(key);
    let nextKeys = previousKeys;
    let deselected = false;

    if (local.multiple) {
      if (alreadySelected) {
        nextKeys = previousKeys.filter((selectedKey) => selectedKey !== key);
        deselected = true;
      } else {
        nextKeys = [...previousKeys, key];
      }
    } else if (!alreadySelected || previousKeys.length !== 1) {
      nextKeys = [key];
    }

    if (nextKeys !== previousKeys) {
      setSelectedKeys(nextKeys);
    }

    const selectInfo = {
      ...info,
      selectedKeys: nextKeys,
    } satisfies SelectInfo<typeof domEvent>;
    if (deselected) {
      local.onDeselect?.(selectInfo);
    } else {
      local.onSelect?.(selectInfo);
    }
    local.onSelectionChange?.(nextKeys, selectInfo);

    if (!inline()) {
      setOpenKeys([]);
      local.onOpenChange?.([]);
    }
  };

  const handleKeyDown: MenuRootProps["onKeyDown"] = (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    const keys = getMenuArrowKeys(
      horizontal(),
      local.direction === MenuDirection.rtl,
    );

    if (event.key === keys.next) {
      event.preventDefault();
      focusRootEntry(1);
    } else if (event.key === keys.prev) {
      event.preventDefault();
      focusRootEntry(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focus({ type: "first", parentKey: undefined });
    } else if (event.key === "End") {
      event.preventDefault();
      focus({ type: "last", parentKey: undefined });
    }
  };

  const context = {
    mode: () => local.mode,
    direction: () => local.direction,
    disabled: () => local.disabled,
    selectable: () => local.selectable,
    multiple: () => local.multiple,
    loop: () => local.loop,
    submenuTrigger: () => local.submenuTrigger,
    selectedKeys,
    openKeys,
    activeKey,
    setActiveKey,
    registerEntry: (entry) => {
      setEntries((prev) => {
        const next = prev.filter((item) => item.id !== entry.id);

        if (next.some((item) => item.key === entry.key)) {
          warning(
            `Duplicate menu key "${String(entry.key)}" detected. Menu keys must be unique.`,
            {
              package: "menu",
              once: true,
            },
          );
        }

        return [...next, entry];
      });
    },
    unregisterEntry: (id) => {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    },

    focus,
    getKeyPath,
    isSelected: (key) => selectedKeys().includes(key),
    isOpen: (key) => openKeys().includes(key),
    hasSelectedDescendant: (key) =>
      selectedKeys().some((selectedKey) => isDescendantOf(selectedKey, key)),
    setSubmenuOpen,
    activate,
    onAction: (info) => {
      local.onAction?.(info);
    },
  } satisfies MenuRootContextValue;

  return (
    <MenuRootContext.Provider value={context}>
      <Polymorphic<MenuRootElementProps>
        as="div"
        role={horizontal() ? "menubar" : "menu"}
        tabIndex={0}
        aria-orientation={horizontal() ? "horizontal" : "vertical"}
        onKeyDown={composeHandlers(local.onKeyDown, handleKeyDown)}
        {...rest}
      />
    </MenuRootContext.Provider>
  );
}
