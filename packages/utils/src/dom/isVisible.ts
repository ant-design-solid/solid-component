export function isVisible(element: Element) {
  if (!element) return false;

  if (element instanceof HTMLElement && element.offsetParent != null) {
    return true;
  }

  if (typeof element.getBoundingClientRect === "function") {
    const { width, height } = element.getBoundingClientRect();
    return width > 0 || height > 0;
  }
  return false;
}
