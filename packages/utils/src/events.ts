type HandlerFn = (...args: any[]) => void;
type EventHandler<E = Event> = (event: E) => void;

type BoundEventHandler<E = Event> = {
  0: (data: any, event: E, ...args: any[]) => void;
  1: any;
};

type HandlerLike = HandlerFn | { 0: HandlerFn; 1: any };

type HandlerEvent<H> = H extends (event: infer E, ...args: any[]) => void
  ? E
  : H extends { 0: (data: any, event: infer E, ...args: any[]) => void; 1: any }
    ? E
    : never;

export function callHandler<H extends HandlerLike>(
  event: HandlerEvent<H> & Event,
  handler: H | undefined,
) {
  if (typeof handler === "function") {
    (handler as EventHandler<HandlerEvent<H>>)(event);
  } else if (handler) {
    (handler as BoundEventHandler<HandlerEvent<H>>)[0](handler[1], event);
  }

  return event?.defaultPrevented;
}
