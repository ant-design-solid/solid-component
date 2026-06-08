import { createContext, useContext, type Accessor } from "solid-js";
import type { MotionOwnProps } from "@solid-component/motion";
import createHasAction from "./hooks/createHasAction";
import { error } from "@solid-component/utils";

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
  placement: string;
  placements: FloatingPlacements;
  alignPoint: boolean;
  popupAlign?: FloatingAlign;
  stretch?: string;
  forceRender?: boolean;
  closeOnClickOutside?: boolean;
  delay: FloatingDelay;
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
  setPopupRef: (node: HTMLElement) => void;
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

export default FloatingContext;
