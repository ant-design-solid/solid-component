import { createControllableSignal } from "@solid-component/utils";
import {
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  type JSX,
} from "solid-js";
import {
  FloatingContext,
  FloatingDelay,
  type FloatingContextValue,
  type FloatingPlacements,
  type FloatingRootOptions,
} from "./FloatingContext";
import createFloating from "./hooks/createFloating";
import createHasAction, { ActionType } from "./hooks/createHasAction";
import useDelay from "./hooks/useDelay";

function getShadowRoot(ele: Node) {
  const root = ele.getRootNode();
  if (root instanceof ShadowRoot) {
    return root;
  }
  return null;
}

export interface FloatingRootOwnProps extends Partial<FloatingRootOptions> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  children?: JSX.Element;

  action?: ActionType | ActionType[];
  showAction?: ActionType[];
  hideAction?: ActionType[];

  delay?: FloatingDelay;
}

export type FloatingRootProps = FloatingRootOwnProps;

const defaults = {
  defaultOpen: false,
  action: "hover",
  placement: "top",
  alignPoint: false,
  placements: {} as FloatingPlacements,
} as const;
export default function FloatingRoot(props: FloatingRootProps) {
  const merged = mergeProps(defaults, props);
  const [open, _setOpen] = createControllableSignal({
    value: () => merged.open,
    defaultValue: () => merged.defaultOpen,
    onChange: (value) => merged.onOpenChange?.(value),
  });
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [popupRef, setPopupRef] = createSignal<HTMLElement>();
  const [pointerPoint, setPointerPoint] = createSignal<[number, number]>();

  const [position, reposition] = createFloating(
    open,
    popupRef,
    createMemo(() =>
      merged.alignPoint && pointerPoint() != null
        ? pointerPoint()
        : triggerRef(),
    ),
    createMemo(() => merged.placement),
    createMemo(() => merged.placements),
    createMemo(() => merged.popupAlign),
  );

  const hasAction = createHasAction(
    createMemo(() => merged.action),
    createMemo(() => merged.showAction),
    createMemo(() => merged.hideAction),
  );

  const delayInvoke = useDelay();

  const setOpen: FloatingContextValue["setOpen"] = (next, delay = 0) => {
    // uniqueContext

    delayInvoke(() => {
      _setOpen((prev) => (typeof next === "function" ? next(prev) : next));
    }, delay);
  };

  const rootOptions = createMemo(
    () =>
      ({
        placement: merged.placement,
        placements: merged.placements,
        alignPoint: merged.alignPoint,
        popupAlign: merged.popupAlign,
        stretch: merged.stretch,
        forceRender: merged.forceRender,
        closeOnClickOutside: merged.closeOnClickOutside,
        delay: {
          ...merged.delay,
          hoverClose: merged.delay?.hoverClose ?? 0.12,
        },
      }) satisfies FloatingRootOptions,
  );

  const context = {
    id: createUniqueId(),
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
    contains: (ele) => {
      const triggerEle = triggerRef();
      const popupEle = popupRef();
      return (
        triggerEle?.contains(ele as Node) ||
        (triggerEle && getShadowRoot(triggerEle)?.host === ele) ||
        ele === triggerEle ||
        popupEle?.contains(ele as Node) ||
        ele === popupEle
      );
    },
  } satisfies FloatingContextValue;

  return (
    <FloatingContext.Provider value={context}>
      {props.children}
    </FloatingContext.Provider>
  );
}
