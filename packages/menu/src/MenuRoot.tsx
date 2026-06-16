import {
  OverflowRoot,
  type OverflowChangeInfo,
} from "@solid-component/overflow";
import Polymorphic, {
  type ElementOf,
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  composeHandlers,
  createControllableSignal,
  createOrderedRegistry,
  mergeRefs,
  warning,
} from "@solid-component/utils";
import {
  createMemo,
  createSelector,
  createSignal,
  mergeProps,
  Show,
  splitProps,
  untrack,
  type JSX,
  type ValidComponent,
} from "solid-js";
import {
  MenuContext,
  type MenuEntry,
  type MenuContextValue,
} from "./MenuContext";
import { MEMU_MORE_UID } from "./MenuMore";
import { getMenuArrowKeys } from "./menu-keydown";
import {
  MenuActionInfo,
  MenuDirection,
  MenuInfo,
  MenuKey,
  MenuMode,
  MenuMotionConfig,
  MenuPopupOptions,
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
  popup?: MenuPopupOptions;
  motion?: MenuMotionConfig;
  motions?: Partial<Record<MenuMode, MenuMotionConfig>>;
  onSelect?: (info: SelectInfo) => void;
  onDeselect?: (info: SelectInfo) => void;
  onSelectionChange?: (selectedKeys: MenuKey[]) => void;
  onOpenChange?: (openKeys: MenuKey[]) => void;
  onAction?: (info: MenuActionInfo) => void;
}

export const MENU_ROOT_OWN_PROPS = [
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
  "popup",
  "motion",
  "motions",
  "onSelect",
  "onDeselect",
  "onSelectionChange",
  "onOpenChange",
  "onAction",
] as const;

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
  defaultSelectedKeys: [] as MenuKey[],
  defaultOpenKeys: [] as MenuKey[],
  popup: {} as MenuPopupOptions,
} as const;

const emptyOverflowInfo: OverflowChangeInfo = {
  visibleKeys: [],
  omittedKeys: [],
  omittedCount: 0,
};

export default function MenuRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuRootProps<T>>,
) {
  const merged = mergeProps(defaults, props as MenuRootProps);
  const [local, rest] = splitProps(merged, [
    ...MENU_ROOT_OWN_PROPS,
    "onKeyDown",
    "ref",
  ]);
  const horizontal = () => local.mode === MenuMode.horizontal;
  const inline = () => local.mode === MenuMode.inline;

  const [selectedKeys, setSelectedKeys] = createControllableSignal<MenuKey[]>({
    value: () => local.selectedKeys,
    defaultValue: local.defaultSelectedKeys,
    onChange: (value) => local.onSelectionChange?.(value),
  });
  const [openKeys, setOpenKeys] = createControllableSignal<MenuKey[]>({
    value: () => local.openKeys,
    defaultValue: local.defaultOpenKeys,
    onChange: (value) => local.onOpenChange?.(value),
  });
  const [activeKey, setActiveKey] = createSignal<MenuKey>();
  const [overflowInfo, setOverflowInfo] =
    createSignal<OverflowChangeInfo>(emptyOverflowInfo);
  const [rootRef, setRootRef] = createSignal<HTMLElement>();
  const isActive = createSelector(activeKey)

  const { registry, items, ordered, register, unregister } =
    createOrderedRegistry<MenuEntry>({
      rootRef,
      package: "menu",
    });

  const entriesByKey = createMemo(() => {
    const next = new Map<MenuKey, MenuEntry>();

    for (const entry of items()) {
      next.set(entry.key(), entry);
    }

    return next;
  });

  const overflowedKeys = createMemo(() => {
    if (!horizontal()) {
      return new Set<MenuKey>();
    }

    return new Set<MenuKey>(overflowInfo().omittedKeys);
  });

  const isOverflowed = (entry: MenuEntry) =>
    entry.parentKey() === undefined && overflowedKeys().has(entry.key());

  const getEntry = (key: MenuKey) => entriesByKey().get(key);
  const getParentKey = (key: MenuKey) => getEntry(key)?.parentKey();

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
    ordered().filter(
      (entry) =>
        entry.parentKey() === parentKey &&
        !entry.disabled() &&
        !isOverflowed(entry) &&
        !!entry.ref(),
    );

  const focusEntry = (entry: MenuEntry | undefined) => {
    if (!entry) {
      return false;
    }
    const ele = entry.ref();

    if (ele) {
      ele.focus();

      if (document.activeElement === ele) {
        setActiveKey(entry.key());
        return true;
      }
    }
    return false;
  };

  const focus: MenuContextValue["focus"] = (request) => {
    if (request.type === "key") {
      if (request.key === undefined) {
        return false;
      }

      const entry = getEntry(request.key);
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

    const currentEntry = getEntry(request.fromKey);
    const currentParentKey = currentEntry?.parentKey();
    const siblings = getFocusableEntries(currentParentKey);
    const currentIndex = siblings.findIndex(
      (entry) => entry.key() === request.fromKey,
    );

    if (currentIndex < 0) {
      return request.direction > 0
        ? focus({ type: "first", parentKey: currentParentKey })
        : focus({ type: "last", parentKey: currentParentKey });
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
      topLevelEntries.some((entry) => entry.key() === activeKey())
    ) {
      return focus({ type: "key", key: activeKey() });
    }

    const selectedEntry = topLevelEntries.find((entry) =>
      isEntrySelected(entry.key()),
    );
    if (selectedEntry) {
      return focusEntry(selectedEntry);
    }

    return focus({
      type: direction > 0 ? "first" : "last",
      parentKey: undefined,
    });
  };

  const setSubmenuOpen: MenuContextValue["setSubmenuOpen"] = (key, open) => {
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

    if (!inline()) {
      setOpenKeys([]);
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
    popup: () => local.popup,
    motion: () => local.motions?.[local.mode] ?? local.motion,

    selectedKeys,
    openKeys,
    isActive,
    setActiveKey,
    register: (entry) => {
      const key = untrack(entry.key);
      const existing = untrack(() => getEntry(key));
      if (existing && existing.id !== entry.id) {
        warning(
          `Duplicate menu key "${String(key)}" detected. Menu keys must be unique.`,
          {
            package: "menu",
            once: true,
          },
        );
      }
      register(entry);

      return () => unregister(entry.id);
    },
    get: getEntry,
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
  } satisfies MenuContextValue;

  return (
    <MenuContext.Provider value={context}>
      <Show
        when={horizontal()}
        fallback={
          <Polymorphic<MenuRootElementProps>
            as="div"
            role="menu"
            tabIndex={0}
            aria-orientation="vertical"
            ref={mergeRefs(local.ref, setRootRef)}
            onKeyDown={composeHandlers(local.onKeyDown, handleKeyDown)}
            {...rest}
          />
        }
      >
        <OverflowRoot
          dir={local.direction}
          maxCount={registry.has(MEMU_MORE_UID) ? "responsive" : "invalidate"}
          role="menubar"
          tabIndex={0}
          aria-orientation="horizontal"
          ref={mergeRefs(local.ref, setRootRef)}
          onOverflowChange={setOverflowInfo}
          onKeyDown={composeHandlers(local.onKeyDown, handleKeyDown)}
          {...rest}
        />
      </Show>
    </MenuContext.Provider>
  );
}
