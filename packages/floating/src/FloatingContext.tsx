import type { MotionOwnProps } from "@solid-component/motion";
import { error } from "@solid-component/utils";
import { createContext, useContext, type Accessor } from "solid-js";
import { FloatingPopupProps } from "./FloatingPopup";
import createHasAction, { ActionType } from "./hooks/createHasAction";

export type AlignPointTopBottom = "t" | "b" | "c";
export type AlignPointLeftRight = "l" | "r" | "c";

/** Two char of 't' 'b' 'c' 'l' 'r'. Example: 'lt' */
export type AlignPoint = `${AlignPointTopBottom}${AlignPointLeftRight}`;

export type OffsetType = number | `${number}%`;

export type FloatingDelay = Partial<
  Record<"hoverOpen" | "hoverClose" | "focusOpen" | "focusClose", number>
>;

export interface FloatingAlign {
  points?: (string | AlignPoint)[];
  offset?: [number, number];
  targetOffset?: [number, number];
  overflow?: {
    adjustX?: boolean | number;
    adjustY?: boolean | number;
    shiftX?: boolean | number;
    shiftY?: boolean | number;
  };
  autoArrow?: boolean;

  htmlRegion?: "visible" | "scroll" | "visibleFirst";

  dynamicInset?: boolean;
}

export interface FloatingPlacements {
  [key: string]: FloatingAlign;
}

export interface FloatingPositionState {
  ready: boolean;
  offsetX: number;
  offsetY: number;
  offsetR: number;
  offsetB: number;
  arrowX: number;
  arrowY: number;
  scaleX: number;
  scaleY: number;
  align: FloatingAlign;
}

export interface FloatingMotionConfig extends Omit<
  MotionOwnProps,
  "visible" | "children"
> {}

export interface FloatingRootOptions {
  open?: boolean;
  defaultOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenChangeEnd?: (open: boolean) => void;

  placement: string;
  placements: FloatingPlacements;
  alignPoint: boolean;
  align?: FloatingAlign;
  stretch?: string;
  forceRender?: boolean;
  closeOnClickOutside?: boolean;
  delay: FloatingDelay;

  action: ActionType | ActionType[];
  showAction?: ActionType[];
  hideAction?: ActionType[];

  onAlign?: (element: HTMLElement, align: FloatingAlign) => void;

  singleton?: boolean;
}

export interface FloatingContextValue {
  id: string;
  open: Accessor<boolean>;
  setOpen: (
    next: boolean | ((prev: boolean) => boolean),
    delay?: number,
  ) => void;
  triggerRef: Accessor<HTMLElement | undefined>;
  setTriggerRef: (node: HTMLElement) => void;
  popupRef: Accessor<HTMLElement | undefined>;
  setPopupRef: (node?: HTMLElement) => void;
  position: Accessor<FloatingPositionState>;
  reposition: (
    cache?: boolean,
  ) => Promise<"updated" | "superseded" | "skipped">;
  hasAction: ReturnType<typeof createHasAction>;
  setPointerPoint: (x: number, y: number) => void;
  rootOptions: Accessor<FloatingRootOptions>;
  registerSubPopup: (id: string, el: HTMLElement | null) => void;
  contains: (ele: EventTarget) => boolean;
}

export const FloatingContext = createContext<FloatingContextValue>();

export function useOptionalFloatingContext() {
  return useContext(FloatingContext);
}

export function useFloatingContext() {
  const context = useOptionalFloatingContext();

  if (!context) {
    error("Floating components must be used within <FloatingRoot>.", {
      package: "floating",
    });
  }

  return context;
}

export interface FloatingPopupEntry {
  id: string;
  context: FloatingContextValue;
  props: Accessor<FloatingPopupProps>;
  activeAt: number;
}

export interface FloatingHostContextValue {
  register: (entry: Omit<FloatingPopupEntry, "activeAt">) => void;
  unregister: (id: string) => void;
  activate: (id: string) => void;
  deactivate: (id: string) => void;
}

export const FloatingHostContext = createContext<FloatingHostContextValue>();

export function useFloatingHostContext() {
  return useContext(FloatingHostContext);
}

export default FloatingContext;
