
export function getMenuArrowKeys(horizontal: boolean, reverse: boolean) {
  return {
    next: horizontal ? (reverse ? "ArrowLeft" : "ArrowRight") : "ArrowDown",
    prev: horizontal ? (reverse ? "ArrowRight" : "ArrowLeft") : "ArrowUp",
    open: horizontal ? "ArrowDown" : reverse ? "ArrowLeft" : "ArrowRight",
    close: horizontal ? "ArrowUp" : reverse ? "ArrowRight" : "ArrowLeft",
  } as const;
}

export const MENU_NAVIGATION_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);
