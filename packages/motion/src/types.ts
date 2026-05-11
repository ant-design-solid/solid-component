import type { JSX } from 'solid-js'

export type MotionStatus = 'appear' | 'enter' | 'leave'
export type MotionPhase = MotionStatus | 'none'
export type MotionStep = 'prepare' | 'start' | 'active' | 'end' | 'idle'

export type MotionEndEvent = Event & {
  deadline?: boolean
}

export type MotionStageName = {
  base?: string
  appear?: string
  appearPrepare?: string
  appearStart?: string
  appearActive?: string
  appearEnd?: string
  enter?: string
  enterPrepare?: string
  enterStart?: string
  enterActive?: string
  enterEnd?: string
  leave?: string
  leavePrepare?: string
  leaveStart?: string
  leaveActive?: string
  leaveEnd?: string
}

export type MotionName = string | MotionStageName

export interface MotionLifecycle {
  onAppearPrepare?: (el: HTMLElement) => void | Promise<void>
  onAppearStart?: (el: HTMLElement) => void
  onAppearActive?: (el: HTMLElement) => void
  onAppearEnd?: (el: HTMLElement, event: MotionEndEvent) => boolean | void

  onEnterPrepare?: (el: HTMLElement) => void | Promise<void>
  onEnterStart?: (el: HTMLElement) => void
  onEnterActive?: (el: HTMLElement) => void
  onEnterEnd?: (el: HTMLElement, event: MotionEndEvent) => boolean | void

  onLeavePrepare?: (el: HTMLElement) => void | Promise<void>
  onLeaveStart?: (el: HTMLElement) => void
  onLeaveActive?: (el: HTMLElement) => void
  onLeaveEnd?: (el: HTMLElement, event: MotionEndEvent) => boolean | void
}

export interface MotionBaseProps extends MotionLifecycle, Partial<Record<MotionStatus, boolean>> {
  visible?: boolean
  name?: MotionName
  removeOnLeave?: boolean
  leavedClassName?: string
  deadline?: number
  forceRender?: boolean
  onVisibleChanged?: (visible: boolean) => void
  children?: JSX.Element
}
