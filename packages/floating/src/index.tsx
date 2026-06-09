import Floating from "./Floating";
import { default as Arrow, type FloatingArrowProps } from "./FloatingArrow";
import {
  FloatingContext as Context,
  type FloatingAlign,
  type FloatingContextValue,
  type FloatingDelay,
  type FloatingMotionConfig,
  type FloatingPlacements,
  type FloatingPositionState,
  type FloatingRootOptions,
  useFloatingContext,
} from "./FloatingContext";
import Host from "./FloatingHost";
import { type FloatingMaskProps, default as Mask } from "./FloatingMask";
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
  Arrow as FloatingArrow,
  Context as FloatingContext,
  Host as FloatingHost,
  Mask as FloatingMask,
  Popup as FloatingPopup,
  Root as FloatingRoot,
  Trigger as FloatingTrigger,
  createFloating,
  useFloatingContext,
  type FloatingArrowProps,
  type FloatingDelay,
  type FloatingMaskProps,
  type FloatingPopupProps,
  type FloatingRootOwnProps,
  type FloatingRootProps,
  type FloatingRootOptions,
  type FloatingTriggerOwnProps,
  type FloatingTriggerProps
};
export type {
  FloatingAlign,
  FloatingContextValue,
  FloatingMotionConfig,
  FloatingPlacements,
  FloatingPositionState
};

export default Object.assign(Floating, {
  Root,
  Trigger,
  Popup,
  Arrow,
  Mask,
  Context,
  Host,
});
