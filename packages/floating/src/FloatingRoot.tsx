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
  FloatingDelay,
  useOptionalFloatingContext,
  type FloatingContextValue,
  type FloatingPlacements,
  type FloatingRootOptions,
} from "./FloatingContext";
import createFloating from "./hooks/createFloating";
import createHasAction, { ActionType } from "./hooks/createHasAction";
import useDelay from "./hooks/useDelay";

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

export interface FloatingRootProps extends FloatingRootOwnProps {}

const defaults = {
  defaultOpen: false,
  action: "hover",
  placement: "top",
  alignPoint: false,
  placements: {} as FloatingPlacements,
} as const;
export default function FloatingRoot(props: FloatingRootProps) {
  const parentContext = useOptionalFloatingContext();
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
    () => merged.action,
    () => merged.showAction,
    () => merged.hideAction,
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

  const id = createUniqueId();
  const subPopups = new Map<string, HTMLElement>();
  const context = {
    id,
    open,
    setOpen,
    triggerRef,
    setTriggerRef,
    popupRef,
    setPopupRef: (el) => {
      setPopupRef(el);

      if (parentContext) {
        parentContext.registerSubPopup(id, el ?? null);

        onCleanup(() => {
          parentContext.registerSubPopup(id, null);
        });
      }
    },
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
