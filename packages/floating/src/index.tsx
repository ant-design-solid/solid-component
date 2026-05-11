import { default as Arrow, type FloatingArrowProps } from './FloatingArrow'
import {
  FloatingContext as Context,
  type FloatingAlign,
  type FloatingContextValue,
  type FloatingMotionConfig,
  type FloatingPlacements,
  type FloatingPositionState,
  useFloatingContext
} from './FloatingContext'
import { type FloatingMaskProps, default as Mask } from './FloatingMask'
import { type FloatingPopupProps, default as Popup } from './FloatingPopup'
import { type FloatingPortalProps, default as Portal } from './FloatingPortal'
import { type FloatingRootProps, default as Root } from './FloatingRoot'
import { type FloatingTriggerProps, default as Trigger } from './FloatingTrigger'

export {
  Arrow as FloatingArrow,
  Context as FloatingContext,
  Mask as FloatingMask,
  Popup as FloatingPopup,
  Portal as FloatingPortal,
  Root as FloatingRoot,
  Trigger as FloatingTrigger,
  useFloatingContext,
  type FloatingArrowProps,
  type FloatingMaskProps,
  type FloatingPopupProps,
  type FloatingPortalProps,
  type FloatingRootProps,
  type FloatingTriggerProps
}
export type { FloatingAlign, FloatingContextValue, FloatingMotionConfig, FloatingPlacements, FloatingPositionState }

export default Object.assign(
  {},
  {
    Root,
    Trigger,
    Popup,
    Arrow,
    Mask,
    Portal,
    Context,
  },
)
