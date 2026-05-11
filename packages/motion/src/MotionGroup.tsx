import type { JSX } from 'solid-js'
import { MotionBaseProps } from './types'

export interface MotionGroupProps extends MotionBaseProps, JSX.HTMLAttributes<HTMLElement> {
  keys: (item: any) => string | number
  component?: string
}

export default function MotionGroup(_props: MotionGroupProps): JSX.Element {
  throw new Error('[diagen]: MotionGroup is not yet implemented.')
}
