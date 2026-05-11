import { createContext, useContext, type Accessor } from 'solid-js'
import type { MotionBaseProps, MotionName } from '@s-components/motion'
import createHasAction from './hooks/createHasAction'

export type AlignPointTopBottom = 't' | 'b' | 'c'
export type AlignPointLeftRight = 'l' | 'r' | 'c'

/** Two char of 't' 'b' 'c' 'l' 'r'. Example: 'lt' */
export type AlignPoint = `${AlignPointTopBottom}${AlignPointLeftRight}`

export type OffsetType = number | `${number}%`

export interface FloatingAlign {
  points?: (string | AlignPoint)[]
  offset?: [number, number]
  targetOffset?: [number, number]
  overflow?: {
    adjustX?: boolean | number
    adjustY?: boolean | number
    shiftX?: boolean | number
    shiftY?: boolean | number
  }
  autoArrow?: boolean

  htmlRegion?: 'visible' | 'scroll' | 'visibleFirst'

  dynamicInset?: boolean
}

export interface FloatingPlacements {
  [key: string]: FloatingAlign
}

export interface FloatingPositionState {
  ready: boolean
  offsetX: number
  offsetY: number
  offsetR: number
  offsetB: number
  arrowX: number
  arrowY: number
  scaleX: number
  scaleY: number
  align: FloatingAlign
}

export interface FloatingMotionConfig extends MotionBaseProps {
  name?: MotionName
}

export interface FloatingRootOptions {
  placement: string
  placements: FloatingPlacements
  alignPoint: boolean
  popupAlign?: FloatingAlign
  stretch?: string
  forceRender?: boolean
}

export interface FloatingContextValue {
  id: string
  open: Accessor<boolean>
  setOpen: (next: boolean | ((prev: boolean) => boolean), delay?: number) => void
  triggerRef: Accessor<HTMLElement | undefined>
  setTriggerRef: (node: HTMLElement) => void
  popupRef: Accessor<HTMLElement | undefined>
  setPopupRef: (node: HTMLElement) => void
  position: Accessor<FloatingPositionState>
  reposition: (cache?: boolean) => Promise<'updated' | 'superseded' | 'skipped'>
  hasAction: ReturnType<typeof createHasAction>
  setPointerPoint: (x: number, y: number) => void
  rootOptions: Accessor<FloatingRootOptions>
}

export const FloatingContext = createContext<FloatingContextValue>()

export function useFloatingContext() {
  const context = useContext(FloatingContext)

  if (!context) {
    throw new Error('[diagen]: Floating components must be used within <FloatingRoot>.')
  }

  return context
}

export default FloatingContext
