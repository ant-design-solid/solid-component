import { JSX } from 'solid-js/jsx-runtime'

export function callHandler<T, E extends Event>(
  event: E & { currentTarget: T; target: Element },
  handler: JSX.EventHandlerUnion<T, E> | undefined,
) {
  if (typeof handler === 'function') {
    handler(event)
  } else if (handler) {
    handler[0](handler[1], event)
  }

  return event?.defaultPrevented
}
