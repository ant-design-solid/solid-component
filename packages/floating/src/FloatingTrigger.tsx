import { mergeProps, splitProps, type JSX, type ValidComponent } from 'solid-js'
import type { ElementOf, PolymorphicProps } from '@solid-component/polymorphic'
import { Polymorphic } from '@solid-component/polymorphic'
import { callHandler, mergeRefs } from '@solid-component/utils'
import { useFloatingContext } from './FloatingContext'
import { ValueOf } from '@solid-primitive/shared'

const HANDLERS = [
  'onClick',
  'onTouchStart',
  'onPointerEnter',
  'onPointerDown',
  'onPointerLeave',
  'onFocus',
  'onBlur',
  'onContextMenu',
] as const

export interface FloatingTriggerOwnProps<T extends HTMLElement = HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  ValueOf<typeof HANDLERS>
> {
  ref: T | ((el: T) => void)
}

type FloatingTriggerElementProps<T extends HTMLElement = HTMLElement> = FloatingTriggerOwnProps<T> & {
  'aria-expanded': boolean
  'aria-controls': string | undefined
}

export type FloatingTriggerProps<T extends ValidComponent | HTMLElement = HTMLElement> =
  Partial<FloatingTriggerOwnProps<ElementOf<T>>>

export default function FloatingTrigger<T extends ValidComponent>(props: PolymorphicProps<T, FloatingTriggerProps<T>>) {
  const merged = mergeProps({ as: 'button' } as const, props as FloatingTriggerProps)
  const [local, others] = splitProps(merged, [
    'as',
    'ref',
    'onClick',
    'onTouchStart',
    'onPointerDown',
    'onPointerEnter',
    'onPointerLeave',
    'onFocus',
    'onBlur',
    'onContextMenu',
  ])
  const context = useFloatingContext()
  const onPointerEnter: FloatingTriggerOwnProps['onPointerEnter'] = e => {
    if (e.pointerType === 'mouse' && context.hasAction('show', 'hover')) {
      context.setPointerPoint(e.clientX, e.clientY)
      context.setOpen(true)
    }
    callHandler(e, local.onPointerEnter)
  }

  const onPointerLeave: FloatingTriggerOwnProps['onPointerLeave'] = e => {
    if (e.pointerType === 'mouse' && context.hasAction('hide', 'hover')) {
      context.setOpen(false)
    }
    callHandler(e, local.onPointerLeave)
  }

  const onClick: FloatingTriggerOwnProps['onClick'] = e => {
    const clickToShow = context.hasAction('show', 'click')
    const clickToHide = context.hasAction('hide', 'click')
    if (clickToShow || clickToHide) {
      const open = context.open()
      if (open && clickToHide) {
        context.setOpen(false)
      } else if (!open && clickToShow) {
        context.setPointerPoint(e.clientX, e.clientY)
        context.setOpen(true)
      }
    }
    callHandler(e, local.onClick)
  }

  const onTouchStart: FloatingTriggerOwnProps['onTouchStart'] = e => {
    const touchToShow = context.hasAction('show', 'touch')
    const touchToHide = context.hasAction('hide', 'touch')
    if (touchToShow || touchToHide) {
      if (context.open() && touchToHide) {
        context.setOpen(false)
      } else if (!context.open() && touchToShow) {
        context.setOpen(true)
      }
    }
    callHandler(e, local.onTouchStart)
  }

  const onPointerDown: FloatingTriggerOwnProps['onPointerDown'] = e => {
    if (!context.open()) {
      void context.reposition()
    }
    callHandler(e, local.onPointerDown)
  }

  const onFocus: FloatingTriggerOwnProps['onFocus'] = e => {
    if (context.hasAction('show', 'focus')) {
      context.setOpen(true)
    }
    callHandler(e, local.onFocus)
  }
  const onBlur: FloatingTriggerOwnProps['onBlur'] = e => {
    if (context.hasAction('hide', 'focus')) {
      context.setOpen(false)
    }
    callHandler(e, local.onBlur)
  }

  const onContextMenu: FloatingTriggerOwnProps['onContextMenu'] = e => {
    if (context.hasAction('show', 'contextmenu')) {
      if (context.open() && context.hasAction('hide', 'contextmenu')) {
        context.setOpen(false)
      } else {
        context.setPointerPoint(e.clientX, e.clientY)
        context.setOpen(true)
      }

      e.preventDefault()
    }
    callHandler(e, local.onContextMenu)
  }

  return (
    <Polymorphic<FloatingTriggerElementProps<ElementOf<T>>>
      as={local.as}
      ref={mergeRefs(local.ref, context.setTriggerRef)}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onTouchStart={onTouchStart}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onContextMenu={onContextMenu}
      aria-expanded={context.open()}
      aria-controls={context.open() ? context.id : undefined}
      {...others}
    />
  )
}
