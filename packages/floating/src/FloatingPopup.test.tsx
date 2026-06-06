import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  popup,
  reposition,
  repositionOrder,
  rootOptions,
  hasAction,
  onClickOutside,
  makeEventListener,
} = vi.hoisted(() => {
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
    closeOnClickOutside: undefined as boolean | undefined,
  }
  const hasAction = vi.fn<HasAction>(() => false)
  const onClickOutside = vi.fn()
  const makeEventListener = vi.fn()
  return {
    popup: document.createElement('div'),
    reposition,
    repositionOrder,
    rootOptions,
    hasAction,
    onClickOutside,
    makeEventListener,
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

vi.mock('@solid-primitive/web', async () => {
  const actual = await vi.importActual<typeof import('@solid-primitive/web')>('@solid-primitive/web')
  return {
    ...actual,
    onClickOutside,
    makeEventListener,
  }
})

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
    hasAction,
    setPointerPoint: vi.fn(),
    rootOptions: () => rootOptions,
    contains: vi.fn(() => false),
  }),
}))

import FloatingPopup from './FloatingPopup'
import { HasAction } from './hooks/createHasAction'

afterEach(() => {
  document.body.innerHTML = ''
  lastMotionProps = undefined
  repositionOrder.length = 0
  reposition.mockClear()
  rootOptions.forceRender = undefined
  rootOptions.closeOnClickOutside = undefined
  hasAction.mockReset()
  hasAction.mockReturnValue(false)
  onClickOutside.mockReset()
  makeEventListener.mockReset()
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

const hasContextMenuListener = () =>
  makeEventListener.mock.calls.some((call) => call[1] === 'contextmenu')

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

  it('uses the existing outside-close behavior when closeOnClickOutside is unset', () => {
    hasAction.mockImplementation(
      (type: 'show' | 'hide', action: string) =>
        type === 'hide' && action === 'contextmenu',
    )

    const { dispose } = mount(() => <FloatingPopup>popup</FloatingPopup>)
    const handler = onClickOutside.mock.calls.at(-1)?.[1] as VoidFunction

    expect(onClickOutside).toHaveBeenCalledTimes(1)
    handler()

    expect(makeEventListener).toHaveBeenCalledWith(
      expect.any(Array),
      'contextmenu',
      expect.any(Function),
      { capture: true },
    )
    dispose()
  })

  it('lets closeOnClickOutside override the derived outside-close behavior', () => {
    hasAction.mockReturnValue(false)
    rootOptions.closeOnClickOutside = true

    const firstMount = mount(() => <FloatingPopup>popup</FloatingPopup>)
    const enabledHandler = onClickOutside.mock.calls.at(-1)?.[1] as VoidFunction
    enabledHandler()
    expect(hasContextMenuListener()).toBe(true)
    firstMount.dispose()

    onClickOutside.mockReset()
    makeEventListener.mockReset()
    rootOptions.closeOnClickOutside = false
    hasAction.mockImplementation(
      (type: 'show' | 'hide', action: string) =>
        type === 'hide' && action === 'click',
    )

    const secondMount = mount(() => <FloatingPopup>popup</FloatingPopup>)
    const disabledHandler = onClickOutside.mock.calls.at(-1)?.[1] as VoidFunction
    disabledHandler()
    expect(hasContextMenuListener()).toBe(false)
    secondMount.dispose()
  })
})
