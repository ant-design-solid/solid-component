import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  popup,
  reposition,
  repositionOrder,
  rootOptions,
  onOpenChangeEnd,
  hasAction,
  onClickOutside,
  makeEventListener,
  setOpen,
} = vi.hoisted(() => {
  const repositionOrder: string[] = []
  const reposition = vi.fn(async () => {
    repositionOrder.push('reposition')
    return 'updated' as const
  })
  const onOpenChangeEnd = vi.fn((visible: boolean) => {
    repositionOrder.push(`open-end-${visible}`)
  })
  const rootOptions = {
    placement: 'top',
    placements: {},
    alignPoint: false,
    align: undefined,
    stretch: undefined,
    singleton: false,
    forceRender: undefined as boolean | undefined,
    closeOnClickOutside: undefined as boolean | undefined,
    delay: {},
    onOpenChangeEnd,
  }
  const hasAction = vi.fn<HasAction>(() => false)
  const onClickOutside = vi.fn()
  const makeEventListener = vi.fn(() => vi.fn())
  const setOpen = vi.fn()
  return {
    popup: document.createElement('div'),
    reposition,
    repositionOrder,
    rootOptions,
    onOpenChangeEnd,
    hasAction,
    onClickOutside,
    makeEventListener,
    setOpen,
  }
})

let lastMotionProps:
  | {
      forceRender?: boolean
      removeOnLeave?: boolean
      onAppearPrepare?: (el: HTMLElement) => Promise<void> | void
      onEnterPrepare?: (el: HTMLElement) => Promise<void> | void
      onLeavePrepare?: (el: HTMLElement) => Promise<void> | void
      onVisibleChangeEnd?: (visible: boolean) => Promise<void> | void
      onMouseLeave?: (event: MouseEvent & { currentTarget: HTMLElement }) => void
    }
  | undefined

vi.mock('@solid-component/motion', () => ({
  default: (props: typeof lastMotionProps) => {
    lastMotionProps = props
    return null
  },
}))

vi.mock('@solid-primitive/event-listener', async () => {
  const actual = await vi.importActual<typeof import('@solid-primitive/event-listener')>('@solid-primitive/event-listener')
  return {
    ...actual,
    onClickOutside,
    makeEventListener,
  }
})

vi.mock('./FloatingContext', () => {
  const floatingContext = () => ({
    id: 'floating',
    open: () => true,
    setOpen,
    triggerRef: () => undefined,
    setTriggerRef: vi.fn(),
    popupRef: () => popup,
    setPopupRef: vi.fn(),
    state: () => ({
      ready: false,
      offsetX: 0,
      offsetY: 0,
      offsetR: 0,
      offsetB: 0,
      scaleX: 1,
      scaleY: 1,
      align: {},
      arrow: {
        x: 0,
        y: 0,
        fill: 'none',
      },
    }),
    update: reposition,
    hasAction,
    setPointerPoint: vi.fn(),
    rootOptions: () => rootOptions,
    registerSubPopup: vi.fn(),
    contains: vi.fn(() => false),
    host: () => undefined,
  })

  return {
    default: {
      Provider: (props: { children: JSX.Element }) => props.children,
    },
    useFloatingContext: floatingContext,
    useOptionalFloatingContext: floatingContext,
    useFloatingHostContext: () => undefined,
  }
})

import FloatingPopup from './FloatingPopup'
import { HasAction } from './hooks/createHasAction'

afterEach(() => {
  document.body.innerHTML = ''
  lastMotionProps = undefined
  repositionOrder.length = 0
  reposition.mockClear()
  rootOptions.forceRender = undefined
  rootOptions.singleton = false
  rootOptions.closeOnClickOutside = undefined
  hasAction.mockReset()
  hasAction.mockReturnValue(false)
  onOpenChangeEnd.mockClear()
  setOpen.mockReset()
  onClickOutside.mockReset()
  makeEventListener.mockReset()
  makeEventListener.mockReturnValue(vi.fn())
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

  it('guards popup mouse leave while internal motion is running', async () => {
    hasAction.mockImplementation(
      (type: 'show' | 'hide', action: string) =>
        type === 'hide' && action === 'hover',
    )

    const { dispose } = mount(() => <FloatingPopup>popup</FloatingPopup>)
    await flushMicrotasks()

    lastMotionProps!.onMouseLeave!({ relatedTarget: null } as MouseEvent & {
      currentTarget: HTMLElement
    })

    expect(setOpen).not.toHaveBeenCalled()

    lastMotionProps!.onVisibleChangeEnd!(true)
    lastMotionProps!.onMouseLeave!({ relatedTarget: null } as MouseEvent & {
      currentTarget: HTMLElement
    })

    expect(setOpen).toHaveBeenCalledWith(false, undefined)

    dispose()
  })

  it('aligns before open change end when motion finishes', async () => {
    const { dispose } = mount(() => <FloatingPopup>popup</FloatingPopup>)
    await flushMicrotasks()

    reposition.mockClear()
    repositionOrder.length = 0

    await lastMotionProps!.onVisibleChangeEnd!(true)
    await flushMicrotasks()

    expect(reposition).toHaveBeenCalledTimes(1)
    expect(onOpenChangeEnd).toHaveBeenCalledWith(true)
    expect(repositionOrder).toEqual(['reposition', 'open-end-true'])

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

  it('falls back to the normal popup when singleton is enabled without a host', () => {
    rootOptions.singleton = true

    const { dispose } = mount(() => <FloatingPopup>popup</FloatingPopup>)

    expect(lastMotionProps).toBeDefined()

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
    makeEventListener.mockReturnValue(vi.fn())
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
