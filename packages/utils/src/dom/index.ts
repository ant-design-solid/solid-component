import { MaybeAccessor, access } from "../solid";

export function canUseDom() {
  return !!(
    typeof window !== "undefined" &&
    window.document &&
    window.document.createElement
  );
}

export function isDOM(node: any): node is HTMLElement | SVGElement {
  // https://developer.mozilla.org/en-US/docs/Web/API/Element
  // Since XULElement is also subclass of Element, we only need HTMLElement and SVGElement
  return node instanceof HTMLElement || node instanceof SVGElement;
}

/**
 * Return if a node is a DOM node. Else will return by `findDOMNode`
 */
export default function findDOMNode<T = Element | Text>(
  _node: MaybeAccessor<HTMLElement | SVGElement>,
): T | null {
  const node = access(_node);
  if (!canUseDom()) {
    return node as any;
  }
  if (isDOM(node)) return node as unknown as T;

  return null;
}

export function getDOM(elementRef: MaybeAccessor) {
  const el = access(elementRef);
  if (!canUseDom()) return el;
  const dom =
    findDOMNode(el) ||
    (el && typeof el === "object"
      ? findDOMNode((el as any).nativeElement)
      : null);

  return dom;
}

export * from "./focus";
export * from "./isVisible";

