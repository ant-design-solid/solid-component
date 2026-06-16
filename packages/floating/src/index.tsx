import Floating from "./Floating";
import FloatingArrow, { type FloatingArrowProps } from "./FloatingArrow";
import {
  type FloatingAlign,
  type FloatingContextValue,
  type FloatingDelay,
  type FloatingMotionConfig,
  type FloatingPlacements,
  type FloatingPositionState,
  type FloatingRootOptions,
  useFloatingContext,
} from "./FloatingContext";
import FloatingHost from "./FloatingHost";
import FloatingMask, { type FloatingMaskProps } from "./FloatingMask";
import { type FloatingPopupProps, default as Popup } from "./FloatingPopup";
import {
  type FloatingRootOwnProps,
  type FloatingRootProps,
  default as Root,
} from "./FloatingRoot";
import {
  type FloatingTriggerOwnProps,
  type FloatingTriggerProps,
  default as Trigger,
} from "./FloatingTrigger";
import createFloating from "./hooks/createFloating";

export {
  createFloating,
  FloatingArrow,
  FloatingHost,
  FloatingMask,
  Popup as FloatingPopup,
  Root as FloatingRoot,
  Trigger as FloatingTrigger,
  useFloatingContext,
  type FloatingArrowProps,
  type FloatingDelay,
  type FloatingMaskProps,
  type FloatingPopupProps,
  type FloatingRootOptions,
  type FloatingRootOwnProps,
  type FloatingRootProps,
  type FloatingTriggerOwnProps,
  type FloatingTriggerProps,
};
export type {
  FloatingAlign,
  FloatingContextValue,
  FloatingMotionConfig,
  FloatingPlacements,
  FloatingPositionState,
};

export default Object.assign(Floating, {
  Root,
  Trigger,
  Popup,
  Arrow: FloatingArrow,
  Mask: FloatingMask,
  Host: FloatingHost,
});
