import {
  createControllableSignal,
  getShadowRoot,
} from "@solid-component/utils";
import {
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  type JSX,
} from "solid-js";
import {
  FloatingContext,
  useOptionalFloatingContext,
  type FloatingContextValue,
  type FloatingPlacements,
  type FloatingRootOptions,
} from "./FloatingContext";
import createFloating from "./hooks/createFloating";
import createHasAction from "./hooks/createHasAction";
import useDelay from "./hooks/useDelay";

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
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [popupRef, setPopupRefSignal] = createSignal<HTMLElement>();
  const [pointerPoint, setPointerPoint] = createSignal<[number, number]>();
  const target = createMemo(() =>
    merged.alignPoint && pointerPoint() != null ? pointerPoint() : triggerRef(),
  );

  const [position, reposition] = createFloating(
    open,
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

  const delayInvoke = useDelay();

  const setOpen: FloatingContextValue["setOpen"] = (next, delay = 0) => {
    delayInvoke(() => {
      _setOpen(next);
    }, delay);
  };

  const rootOptions = () => merged satisfies FloatingRootOptions;

  const id = createUniqueId();
  const subPopups = new Map<string, HTMLElement>();
  const setPopupRef: FloatingContextValue["setPopupRef"] = (el) => {
    setPopupRefSignal(el);

    if (parentContext) {
      parentContext.registerSubPopup(id, el ?? null);

      onCleanup(() => {
        parentContext.registerSubPopup(id, null);
      });
    }
  };
  const context = {
    id,
    open,
    setOpen,
    triggerRef,
    setTriggerRef,
    popupRef,
    setPopupRef,
    position,
    reposition,
    hasAction,
    setPointerPoint: (x: number, y: number) => setPointerPoint([x, y]),
    rootOptions,
    registerSubPopup(id, ele) {
      if (ele) {
        subPopups.set(id, ele);
      } else {
        subPopups.delete(id);
      }

      parentContext?.registerSubPopup(id, ele);
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
  } satisfies FloatingContextValue;

  return (
    <FloatingContext.Provider value={context}>
      {props.children}
    </FloatingContext.Provider>
  );
}
