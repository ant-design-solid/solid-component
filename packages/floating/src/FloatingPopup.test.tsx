import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { popup, reposition, repositionOrder, rootOptions } = vi.hoisted(() => {
  const repositionOrder: string[] = []
  const reposition = vi.fn(async () => {
    repositionOrder.push('reposition')
    return 'updated' as const
  })
  const rootOptions = {
    placement: 'top',
    placements: {},
    alignPoint: false,
    popupAlign: undefined,
    stretch: undefined,
    forceRender: undefined as boolean | undefined,
  }
  return {
    popup: document.createElement('div'),
    reposition,
    repositionOrder,
    rootOptions,
  }
})

let lastMotionProps:
  | {
      forceRender?: boolean
      removeOnLeave?: boolean
      onEnterPrepare?: (el: HTMLElement) => Promise<void> | void
    }
  | undefined

vi.mock('@solid-component/motion', () => ({
  default: (props: { forceRender?: boolean; removeOnLeave?: boolean; onEnterPrepare?: (el: HTMLElement) => Promise<void> | void }) => {
    lastMotionProps = props
    return null
  },
}))

vi.mock('./FloatingContext', () => ({
  useFloatingContext: () => ({
    id: 'floating',
    open: () => true,
    setOpen: vi.fn(),
    triggerRef: () => undefined,
    setTriggerRef: vi.fn(),
    popupRef: () => popup,
    setPopupRef: vi.fn(),
    position: () => ({
      ready: false,
      offsetX: 0,
      offsetY: 0,
      offsetR: 0,
      offsetB: 0,
      arrowX: 0,
      arrowY: 0,
      scaleX: 1,
      scaleY: 1,
      align: {},
    }),
    reposition,
    hasAction: vi.fn(() => false),
    setPointerPoint: vi.fn(),
    rootOptions: () => rootOptions,
  }),
}))

import FloatingPopup from './FloatingPopup'

afterEach(() => {
  document.body.innerHTML = ''
  lastMotionProps = undefined
  repositionOrder.length = 0
  reposition.mockClear()
  rootOptions.forceRender = undefined
})

const mount = (view: () => JSX.Element) => {
  const host = document.createElement('div')
  document.body.appendChild(host)

  const dispose = render(view, host)

  return { host, dispose }
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('FloatingPopup', () => {
  it('waits for reposition before running motion prepare', async () => {
    const userPrepare = vi.fn(async () => {
      repositionOrder.push('user')
    })

    const { dispose } = mount(() => <FloatingPopup motion={{ onEnterPrepare: userPrepare }}>popup</FloatingPopup>)
    await flushMicrotasks()

    reposition.mockClear()
    repositionOrder.length = 0

    expect(lastMotionProps?.onEnterPrepare).toBeTypeOf('function')
    await lastMotionProps!.onEnterPrepare!(document.createElement('div'))

    expect(reposition).toHaveBeenCalledTimes(1)
    expect(userPrepare).toHaveBeenCalledTimes(1)
    expect(repositionOrder).toEqual(['reposition', 'user'])

    dispose()
  })

  it('does not keep popup mounted after leave by default', () => {
    const { dispose } = mount(() => <FloatingPopup>popup</FloatingPopup>)

    expect(lastMotionProps?.forceRender).toBeUndefined()
    expect(lastMotionProps?.removeOnLeave).toBe(true)

    dispose()
  })

  it('keeps popup mounted after leave when forceRender is true', () => {
    rootOptions.forceRender = true

    const { dispose } = mount(() => <FloatingPopup>popup</FloatingPopup>)

    expect(lastMotionProps?.forceRender).toBe(true)
    expect(lastMotionProps?.removeOnLeave).toBe(false)

    dispose()
  })
})
