import { createMemo, createSignal, createUniqueId, mergeProps, type JSX } from 'solid-js'
import {
  FloatingContext,
  type FloatingContextValue,
  type FloatingPlacements,
  type FloatingRootOptions,
} from './FloatingContext'
import createHasAction, { ActionType } from './hooks/createHasAction'
import createFloating from './hooks/createFloating'
import useDelay from './hooks/useDelay'

export interface FloatingRootOwnProps extends Partial<FloatingRootOptions> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void

  children?: JSX.Element

  action?: ActionType | ActionType[]
  showAction?: ActionType[]
  hideAction?: ActionType[]
}

export type FloatingRootProps = FloatingRootOwnProps

const defaults = {
  defaultOpen: false,
  action: 'hover',
  placement: 'top',
  alignPoint: false,
  placements: {} as FloatingPlacements,
} as const
export default function FloatingRoot(props: FloatingRootProps) {
  const merged = mergeProps(defaults, props)
  const isUncontrolled = createMemo(() => merged.open === undefined)
  const [internalOpen, setInternalOpen] = createSignal(merged.defaultOpen)
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>()
  const [popupRef, setPopupRef] = createSignal<HTMLElement>()
  const [pointerPoint, setPointerPoint] = createSignal<[number, number]>()

  const open = createMemo(() => merged.open ?? internalOpen())

  const [position, reposition] = createFloating(
    open,
    popupRef,
    createMemo(() => (merged.alignPoint && pointerPoint() != null ? pointerPoint() : triggerRef())),
    createMemo(() => merged.placement),
    createMemo(() => merged.placements),
    createMemo(() => merged.popupAlign),
  )

  const hasAction = createHasAction(
    createMemo(() => merged.action),
    createMemo(() => merged.showAction),
    createMemo(() => merged.hideAction),
  )

  const internalSetOpen = (nextOpen: boolean) => {
    if (open() === nextOpen) return
    setInternalOpen(nextOpen)
    props.onOpenChange?.(nextOpen)
  }

  const delayInvoke = useDelay()

  const setOpen: FloatingContextValue['setOpen'] = (next, delay = 0) => {
    const nextOpen = typeof next === 'function' ? next(open()) : next

    if (!isUncontrolled()) {
      delayInvoke(() => {
        internalSetOpen(nextOpen)
      }, delay)
      return
    }
    // uniqueContext

    delayInvoke(() => {
      internalSetOpen(nextOpen)
    }, delay)
  }

  const id = createUniqueId()
  const rootOptions = createMemo(
    () =>
      ({
        placement: merged.placement,
        placements: merged.placements,
        alignPoint: merged.alignPoint,
        popupAlign: merged.popupAlign,
        stretch: merged.stretch,
        forceRender: merged.forceRender,
      }) satisfies FloatingRootOptions,
  )

  const context = {
    id,
    open,
    setOpen,
    triggerRef,
    setTriggerRef,
    popupRef,
    setPopupRef,
    position,
    reposition,
    hasAction,
    setPointerPoint: (x: number, y: number) => setPointerPoint([x, y]),
    rootOptions,
  } satisfies FloatingContextValue

  return <FloatingContext.Provider value={context}>{props.children}</FloatingContext.Provider>
}
