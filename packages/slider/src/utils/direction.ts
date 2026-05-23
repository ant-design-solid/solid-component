import { JSX } from "solid-js";

export type SliderDirection = "ltr" | "rtl" | "ttb" | "btt";

function isVerticalDirection(direction: SliderDirection) {
  return direction === "ttb" || direction === "btt";
}

const EDGES = ["left", "top", "bottom", "right"] as const;

function getStartEdge(direction: SliderDirection) {
  return EDGES.find((item) => item[0] === direction[0])!;
}

export function getPointerPercent(
  event: PointerEvent,
  rect: Pick<DOMRect, "bottom" | "height" | "left" | "right" | "top" | "width">,
  direction: SliderDirection,
) {
  const { width, height, left, top, right, bottom } = rect;
  const { clientX, clientY } = event;

  switch (direction) {
    case "btt":
      return height > 0 ? (bottom - clientY) / height : undefined;
    case "ttb":
      return height > 0 ? (clientY - top) / height : undefined;
    case "rtl":
      return width > 0 ? (right - clientX) / width : undefined;
    default:
      return width > 0 ? (clientX - left) / width : undefined;
  }
}

export function getFillStyle(
  startPercent: number,
  endPercent: number,
  direction: SliderDirection,
): JSX.CSSProperties {
  const startEdge = getStartEdge(direction);
  const startIndex = EDGES.indexOf(startEdge);
  const endIndex = startIndex ^ 0b11;
  const endEdge = EDGES[endIndex];

  const style: JSX.CSSProperties = {
    position: "absolute",
  };

  style[startEdge] = `${startPercent}%`;
  style[endEdge] = `${Math.max(0, endPercent)}%`;

  if (isVerticalDirection(direction)) {
    style.left = "0";
    style.width = "100%";
  } else {
    style.top = "0";
    style.height = "100%";
  }

  return style;
}

export function getThumbStyle(
  percent: number,
  direction: SliderDirection,
): JSX.CSSProperties {
  const startEdge = getStartEdge(direction);
  const style: JSX.CSSProperties = {
    position: "absolute",
    "touch-action": "none",
    "forced-color-adjust": "none",
  };

  style[startEdge] = `${percent}%`;

  if (isVerticalDirection(direction)) {
    style.left = "50%";
    style.transform =
      direction === "ttb" ? "translate(-50%, -50%)" : "translate(-50%, 50%)";
  } else {
    style.top = "50%";
    style.transform =
      direction === "rtl" ? "translate(50%, -50%)" : "translate(-50%, -50%)";
  }

  return style;
}
