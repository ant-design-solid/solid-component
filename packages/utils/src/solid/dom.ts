import { JSX } from "solid-js";
import { isServer } from "solid-js/web";

const isServerElement = <E extends Element>(item: JSX.Element | E): item is E =>
  item != null && typeof item === "object" && "t" in item;

export const genIsElement =
  <E extends abstract new (...args: any[]) => Element>(ElementConstructor: E) =>
  (item: JSX.Element | InstanceType<E>): item is InstanceType<E> =>
    item instanceof ElementConstructor;

export const isElement = isServer ? isServerElement : genIsElement(Element);

export const isHTMLElement = isServer
  ? isServerElement<HTMLElement>
  : genIsElement(HTMLElement);
