import Motion from './Motion'
import MotionGroup from './MotionGroup'

export { default as Motion, type MotionProps, type MotionCommonProps } from './Motion'
export { default as MotionGroup } from './MotionGroup'
export type { MotionBaseProps, MotionLifecycle, MotionName, MotionPhase, MotionStatus, MotionStep } from './types'

export default Object.assign(Motion, {
  Group: MotionGroup,
})
