import Motion from './Motion'
import MotionGroup from './MotionGroup'

export { default as Motion, type MotionOwnProps, type MotionProps } from './Motion'
export {
  default as MotionGroup,
  type MotionGroupOwnProps,
  type MotionGroupProps,
} from './MotionGroup'
export type { MotionBaseProps, MotionLifecycle, MotionName, MotionPhase, MotionStatus, MotionStep } from './types'

export default Object.assign(Motion, {
  Group: MotionGroup,
})
