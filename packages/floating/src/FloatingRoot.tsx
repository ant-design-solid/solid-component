import {
  createControllableSignal,
  getShadowRoot,
} from "@solid-component/utils";
import { noop } from "@solid-primitive/utils";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  type JSX,
} from "solid-js";
import {
  FloatingContext,
  useFloatingHostContext,
  useOptionalFloatingContext,
  type FloatingContextValue,
  type FloatingPlacements,
  type FloatingRootOptions,
} from "./FloatingContext";
import createFloating from "./hooks/createFloating";
import createHasAction from "./hooks/createHasAction";
import { warning } from "./utils";

export interface FloatingRootOwnProps extends Partial<FloatingRootOptions> {}

export interface FloatingRootCommonProps {
  children?: JSX.Element;
}

export interface FloatingRootProps
  extends FloatingRootOwnProps, FloatingRootCommonProps {}

const defaults = {
  defaultOpen: false,
  action: "hover",
  placement: "top",
  alignPoint: false,
  singleton: false,
  placements: {} as FloatingPlacements,
} as const;
export default function FloatingRoot(props: FloatingRootProps) {
  const hostContext = useFloatingHostContext();
  const parentContext = useOptionalFloatingContext();
  const merged = mergeProps(defaults, props, {
    get delay() {
      const delay = props.delay ?? {};
      return {
        ...delay,
        hoverClose: delay.hoverClose ?? 0.12,
      };
    },
  });
  const [open, _setOpen] = createControllableSignal({
    value: () => merged.open,
    defaultValue: () => merged.defaultOpen,
    onChange: (value) => merged.onOpenChange?.(value),
  });
  const rootOptions = () => merged satisfies FloatingRootOptions;
  const id = createUniqueId();
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [popupRef, setPopupRef] = createSignal<HTMLElement>();
  const [pointerPoint, setPointerPoint] = createSignal<[number, number]>();
  const target = createMemo(() =>
    merged.alignPoint && pointerPoint() != null ? pointerPoint() : triggerRef(),
  );
  const host = createMemo(() => {
    if (!rootOptions().singleton) {
      return;
    }
    if (!hostContext) {
      warning(`singleton need <Floating.Host>`);
      return;
    }
    return hostContext;
  });
  const visible = createMemo(() => {
    const activeHost = host();

    if (!activeHost) {
      return open();
    }

    return activeHost.isActive(id) && activeHost.open();
  });

  const [state, update] = createFloating(
    visible,
    popupRef,
    target,
    () => merged.placement,
    () => merged.placements,
    () => merged.align,
    merged.onAlign,
  );

  const hasAction = createHasAction(
    () => merged.action,
    () => merged.showAction,
    () => merged.hideAction,
  );

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const setOpen: FloatingContextValue["setOpen"] = (next, delay = 0) => {
    timeoutId && clearTimeout(timeoutId);
    timeoutId = undefined;
    if (!delay) {
      _setOpen(next);
    } else {
      timeoutId = setTimeout(() => {
        _setOpen(next);
      }, delay * 1000);
    }
  };

  onCleanup(() => {
    timeoutId && clearTimeout(timeoutId);
    timeoutId = undefined;
  });

  const subPopups = new Map<string, HTMLElement>();
  createEffect(() => {
    const popupEle = popupRef();

    if (!parentContext || !popupEle) {
      return;
    }

    onCleanup(parentContext.registerSubPopup(id, popupEle));
  });

  const context = {
    id,
    open,
    setOpen,

    state,
    update,

    triggerRef,
    setTriggerRef,
    popupRef,
    setPopupRef,
    hasAction,
    setPointerPoint: (x: number, y: number) => setPointerPoint([x, y]),
    rootOptions,
    registerSubPopup(id, ele) {
      subPopups.set(id, ele);

      const dispose = parentContext
        ? parentContext.registerSubPopup(id, ele)
        : noop;

      return () => {
        subPopups.delete(id);
        dispose();
      };
    },
    contains: (ele) => {
      const triggerEle = triggerRef();
      const popupEle = popupRef();
      const isContain = (parent?: Node) =>
        parent?.contains(ele as Node) || ele === parent;

      return (
        isContain(triggerEle) ||
        (triggerEle && getShadowRoot(triggerEle)?.host === ele) ||
        isContain(popupEle) ||
        (popupEle && getShadowRoot(popupEle)?.host === ele) ||
        subPopups.values().some((subPopupEl) => isContain(subPopupEl))
      );
    },
    host,
  } satisfies FloatingContextValue;

  return (
    <FloatingContext.Provider value={context}>
      {props.children}
    </FloatingContext.Provider>
  );
}
