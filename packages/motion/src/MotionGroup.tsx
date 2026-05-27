import { ElementOf, Polymorphic, PolymorphicProps } from "@solid-component/polymorphic";
import { createWarning } from "@solid-component/utils";
import { isObject } from "@solid-primitive/shared";
import { createListMotion } from "@solid-primitive/web";
import {
  createContext,
  createEffect,
  createSignal,
  For,
  mergeProps,
  splitProps,
  useContext,
  type Accessor,
  type JSX,
  type ParentProps,
  type ValidComponent,
} from "solid-js";
import Motion, { MotionProps } from "./Motion";
import type { MotionEndEvent, MotionName } from "./types";

type MotionKey = string | number;
type MotionIdentity = MotionKey | object;
type MotionGroupByProp<T> = [T] extends [MotionKey]
  ? { by?: MotionGroupBy<T> }
  : { by: MotionGroupBy<T> };
type MotionLifecycleProps = Pick<
  MotionProps,
  | "onAppearPrepare"
  | "onAppearStart"
  | "onAppearActive"
  | "onAppearEnd"
  | "onEnterPrepare"
  | "onEnterStart"
  | "onEnterActive"
  | "onEnterEnd"
  | "onLeavePrepare"
  | "onLeaveStart"
  | "onLeaveActive"
  | "onLeaveEnd"
>;

export type MotionGroupBy<T> = keyof T | ((item: T) => MotionKey);

interface MotionGroupLifecycle<T> {
  onAppearPrepare?: (el: HTMLElement, item: T, key: MotionIdentity) => void | Promise<void>;
  onAppearStart?: (el: HTMLElement, item: T, key: MotionIdentity) => void;
  onAppearActive?: (el: HTMLElement, item: T, key: MotionIdentity) => void;
  onAppearEnd?: (
    el: HTMLElement,
    item: T,
    key: MotionIdentity,
    event: MotionEndEvent,
  ) => boolean | void;
  onEnterPrepare?: (el: HTMLElement, item: T, key: MotionIdentity) => void | Promise<void>;
  onEnterStart?: (el: HTMLElement, item: T, key: MotionIdentity) => void;
  onEnterActive?: (el: HTMLElement, item: T, key: MotionIdentity) => void;
  onEnterEnd?: (
    el: HTMLElement,
    item: T,
    key: MotionIdentity,
    event: MotionEndEvent,
  ) => boolean | void;
  onLeavePrepare?: (el: HTMLElement, item: T, key: MotionIdentity) => void | Promise<void>;
  onLeaveStart?: (el: HTMLElement, item: T, key: MotionIdentity) => void;
  onLeaveActive?: (el: HTMLElement, item: T, key: MotionIdentity) => void;
  onLeaveEnd?: (
    el: HTMLElement,
    item: T,
    key: MotionIdentity,
    event: MotionEndEvent,
  ) => boolean | void;
}

interface MotionGroupBaseProps<T> extends MotionGroupLifecycle<T> {
  each: readonly T[];
  children: (item: T, index: Accessor<number>) => JSX.Element;
  appear?: boolean;
  enter?: boolean;
  leave?: boolean;
  name?: MotionName;
  deadline?: number;
}

export type MotionGroupOwnProps<T> = MotionGroupBaseProps<T> & MotionGroupByProp<T>;

interface MotionGroupCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "class" | "style"
> {}

export type MotionGroupProps<
  V,
  T extends HTMLElement | ValidComponent = HTMLElement,
> = MotionGroupOwnProps<V> & MotionGroupCommonProps<ElementOf<T>>;

export interface MotionGroupItemOwnProps<T extends HTMLElement = HTMLElement> extends ParentProps {}

export type MotionGroupItemProps<T extends ValidComponent | HTMLElement = HTMLElement> = Partial<
  MotionGroupItemOwnProps<ElementOf<T>>
>;

interface MotionGroupState<T> {
  key: MotionIdentity;
  item: T;
  isInitial: boolean;
  enterTick: number;

  present: Accessor<boolean>;
  setPresent: (present: boolean) => void;
  visible: Accessor<boolean>;
  setVisible: (visible: boolean) => void;
  onRemoved?: VoidFunction;
}

interface MotionGroupItemContextValue<T> {
  state: MotionGroupState<T>;
  props: MotionGroupOwnProps<T>;
}

const defaults = {
  as: "div",
  appear: true,
  enter: true,
  leave: true,
} as const;

const MotionGroupItemContext = createContext<MotionGroupItemContextValue<any>>();
const warning = createWarning("solid-components");

function resolveMotionIdentity<T>(item: T, by?: MotionGroupBy<T>): MotionIdentity {
  if (typeof by === "function") {
    return by(item);
  }

  if (typeof by === "string" && isObject(item)) {
    return item[by] as MotionKey;
  }

  return isObject(item) ? item : (item as MotionKey);
}

function createMotionGroupState<T>(
  key: MotionIdentity,
  item: T,
  isInitial: boolean,
): MotionGroupState<T> {
  const [present, setPresent] = createSignal(true);
  const [visible, setVisible] = createSignal(isInitial);

  return {
    key,
    item,
    isInitial,
    enterTick: 0,
    present,
    setPresent,
    visible,
    setVisible,
  };
}

function getGroupMotionLifecycleProps<T>(
  props: MotionGroupOwnProps<T>,
  state: MotionGroupState<T>,
) {
  return {
    onAppearPrepare: (el: HTMLElement) => props.onAppearPrepare?.(el, state.item, state.key),
    onAppearStart: (el: HTMLElement) => props.onAppearStart?.(el, state.item, state.key),
    onAppearActive: (el: HTMLElement) => props.onAppearActive?.(el, state.item, state.key),
    onAppearEnd: (el: HTMLElement, event: MotionEndEvent) =>
      props.onAppearEnd?.(el, state.item, state.key, event),
    onEnterPrepare: (el: HTMLElement) => props.onEnterPrepare?.(el, state.item, state.key),
    onEnterStart: (el: HTMLElement) => props.onEnterStart?.(el, state.item, state.key),
    onEnterActive: (el: HTMLElement) => props.onEnterActive?.(el, state.item, state.key),
    onEnterEnd: (el: HTMLElement, event: MotionEndEvent) =>
      props.onEnterEnd?.(el, state.item, state.key, event),
    onLeavePrepare: (el: HTMLElement) => props.onLeavePrepare?.(el, state.item, state.key),
    onLeaveStart: (el: HTMLElement) => props.onLeaveStart?.(el, state.item, state.key),
    onLeaveActive: (el: HTMLElement) => props.onLeaveActive?.(el, state.item, state.key),
    onLeaveEnd: (el: HTMLElement, event: MotionEndEvent) =>
      props.onLeaveEnd?.(el, state.item, state.key, event),
  } satisfies MotionLifecycleProps;
}

function useMotionGroupItemContext<T>() {
  const context = useContext(MotionGroupItemContext) as MotionGroupItemContextValue<T> | undefined;
  if (!context) {
    throw new Error("[solid-components]: MotionGroup.Item must be used within MotionGroup.");
  }
  return context;
}

export function MotionGroupItem<T extends ValidComponent = "div">(
  props: PolymorphicProps<T, MotionGroupItemProps<T>>,
) {
  const merged = mergeProps({ as: "div" }, props as MotionGroupItemProps);
  const [local, others] = splitProps(merged, ["as", "children"]);
  const { state, props: contextProps } = useMotionGroupItemContext<any>();
  const lifecycle = getGroupMotionLifecycleProps(contextProps, state);

  createEffect(() => {
    const nextPresent = state.present();
    // 用递增版本号标记当前可见性变更，避免延迟的微任务回写过期状态。
    state.enterTick += 1;
    const currentEnterTick = state.enterTick;

    if (!nextPresent) {
      state.setVisible(false);
      return;
    }

    // 初始项直接可见；其余项只要已经进入可见态，就保持稳定显示。
    if (state.isInitial || state.visible()) {
      state.setVisible(true);
      return;
    }

    queueMicrotask(() => {
      // 如果本轮 enter 还未开始就被下一次变更打断，直接放弃这次延迟显示。
      if (state.enterTick !== currentEnterTick || !state.present()) {
        return;
      }

      state.setVisible(true);
    });
  });

  return (
    <Motion<ValidComponent>
      as={local.as}
      visible={state.visible()}
      appear={state.isInitial && contextProps.appear}
      enter={contextProps.enter}
      leave={contextProps.leave}
      name={contextProps.name}
      deadline={contextProps.deadline}
      onVisibleChanged={(visible) => {
        if (!visible) {
          state.onRemoved?.();
        }
      }}
      {...lifecycle}
      {...others}
    >
      {local.children}
    </Motion>
  );
}

function MotionGroupRoot<T, C extends ValidComponent = "div">(
  props: PolymorphicProps<C, MotionGroupProps<T, C>>,
) {
  const merged = mergeProps(defaults, props as MotionGroupProps<T, C>);
  const [local, others] = splitProps(merged, [
    "as",
    "each",
    "by",
    "appear",
    "enter",
    "leave",
    "name",
    "deadline",
    "children",
    "onAppearPrepare",
    "onAppearStart",
    "onAppearActive",
    "onAppearEnd",
    "onEnterPrepare",
    "onEnterStart",
    "onEnterActive",
    "onEnterEnd",
    "onLeavePrepare",
    "onLeaveStart",
    "onLeaveActive",
    "onLeaveEnd",
  ]);

  const stateCache = new Map<MotionIdentity, MotionGroupState<T>>();
  let seededInitialStates = false;

  const states = () => {
    // 只对当前这轮 each 做重复 key 检查，避免把正常的跨次复用误判成冲突。
    const seenKeys = new Set<MotionIdentity>();

    return (local.each ?? []).map((item, index) => {
      const key = resolveMotionIdentity(item, local.by);

      if (key === undefined) {
        warning(
          `MotionGroup item at index ${index} resolved to an undefined key. ` +
            `Object items should provide a stable "by" prop or return value.`,
        );
      }

      if (seenKeys.has(key)) {
        warning(
          `MotionGroup detected a duplicate key "${String(key)}". ` +
            `Duplicate keys can break enter/leave state tracking.`,
        );
      }

      seenKeys.add(key);

      const state = stateCache.get(key) ?? createMotionGroupState(key, item, !seededInitialStates);

      state.item = item;
      state.onRemoved = undefined;
      state.setPresent(true);
      stateCache.set(key, state);
      return state;
    });
  };

  createEffect(() => {
    states();
    seededInitialStates = true;
  });

  const visibleStates = createListMotion(states, {
    appear: false,
    exitMethod: "keep-index",
    onChange({ removed, finishRemoved }) {
      for (const state of removed) {
        state.setPresent(false);
        state.onRemoved = () => {
          // leave 结束后再真正移除列表项，并同步清理缓存状态。
          finishRemoved([state]);
          stateCache.delete(state.key);
        };
      }
    },
  });

  return (
    <Polymorphic<MotionGroupCommonProps<ElementOf<C>>> as={local.as} {...others}>
      <For each={visibleStates()}>
        {(state, index) => (
          <MotionGroupItemContext.Provider
            value={{
              state,
              props: local,
            }}
          >
            {local.children(state.item, index)}
          </MotionGroupItemContext.Provider>
        )}
      </For>
    </Polymorphic>
  );
}

export default Object.assign(MotionGroupRoot, {
  Item: MotionGroupItem,
});
