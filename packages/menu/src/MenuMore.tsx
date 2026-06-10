import { FloatingRoot, FloatingTrigger } from "@solid-component/floating";
import { OverflowRest, useOverflowContext } from "@solid-component/overflow";
import type { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import { composeHandlers, mergeRefs } from "@solid-component/utils";
import {
  createMemo,
  createSignal,
  For,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { MenuOverflowPopupContext, useMenuContext } from "./MenuContext";
import { MenuPopupContent } from "./MenuSubmenuContent";
import { MENU_POPUP_PLACEMENTS, resolvePlacement } from "./placements";
import { MenuMode, MenuPopupTrigger } from "./types";

export interface MenuMoreOwnProps {
  trigger?: MenuPopupTrigger;
}

export interface MenuMoreCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref" | "children" | "onFocus"
> {}

export interface MenuMoreProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends MenuMoreOwnProps, MenuMoreCommonProps<ElementOf<T>> {}

const MENU_MORE_KEY = "__more__";

export const MEMU_MORE_UID = Symbol(MENU_MORE_KEY);

const defaults = {
  children: "...",
} as const;

export default function MenuMore<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuMoreProps<T>>,
) {
  const {
    mode,
    direction,
    disabled,
    popup,
    activeKey,
    setActiveKey,
    register,
    get,
  } = useMenuContext();
  const merged = mergeProps(defaults, props as MenuMoreProps);
  const [local, rest] = splitProps(merged, [
    "trigger",
    "children",
    "ref",
    "onFocus",
  ]);
  const id = MEMU_MORE_UID;
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const trigger = createMemo(() =>
    disabled() ? [] : (local.trigger ?? popup().trigger),
  );
  const placement = createMemo(() => resolvePlacement(mode(), direction(), 1));
  const { changeInfo: overflowInfo } = useOverflowContext();

  const entry = {
    id,
    key: () => MENU_MORE_KEY,
    parentKey: () => undefined,
    disabled,
    ref: triggerRef,
  };
  onCleanup(register(entry));

  const onFocus = () => {
    setActiveKey(MENU_MORE_KEY);
  };

  return (
    <Show when={mode() === MenuMode.horizontal}>
      <FloatingRoot
        action={trigger()}
        placement={placement()}
        placements={MENU_POPUP_PLACEMENTS}
      >
        <OverflowRest>
          <FloatingTrigger
            ref={mergeRefs(local.ref, setTriggerRef)}
            role="menuitem"
            tabIndex={activeKey() === MENU_MORE_KEY ? 0 : -1}
            aria-haspopup="menu"
            aria-disabled={disabled() || undefined}
            data-menu-key={MENU_MORE_KEY}
            onFocus={composeHandlers(local.onFocus, onFocus)}
            {...rest}
          >
            {local.children}
          </FloatingTrigger>
        </OverflowRest>
        <Show when={overflowInfo().omittedCount > 0}>
          <MenuOverflowPopupContext.Provider value={true}>
            <MenuPopupContent>
              <For each={overflowInfo().omittedKeys}>
                {(key) => get(key)?.renderInMore?.()}
              </For>
            </MenuPopupContent>
          </MenuOverflowPopupContext.Provider>
        </Show>
      </FloatingRoot>
    </Show>
  );
}
