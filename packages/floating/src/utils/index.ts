import { error as _error, warning as _waring } from "@solid-component/utils";
import { JSX } from "solid-js";
import { FloatingPositionState } from "../FloatingContext";

export function getWin(ele: HTMLElement) {
  return ele.ownerDocument.defaultView;
}

export function collectScroller(ele: HTMLElement) {
  const scrollerList: HTMLElement[] = [];
  let current = ele?.parentElement;

  const scrollStyle = ["hidden", "scroll", "clip", "auto"];

  while (current) {
    const win = getWin(current);
    if (!win) {
      break;
    }
    const { overflowX, overflowY, overflow } = win.getComputedStyle(current);
    if ([overflowX, overflowY, overflow].some((o) => scrollStyle.includes(o))) {
      scrollerList.push(current);
    }

    current = current.parentElement;
  }

  return scrollerList;
}

export function toNum(num: number, defaultValue = 1) {
  return Number.isNaN(num) ? defaultValue : num;
}

function getPxValue(val: string) {
  return toNum(parseFloat(val), 0);
}

export interface VisibleArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function getScrollerClip(ele: HTMLElement): VisibleArea | null {
  if (ele instanceof HTMLBodyElement || ele instanceof HTMLHtmlElement)
    return null;

  const {
    overflow,
    overflowClipMargin,
    borderTopWidth,
    borderBottomWidth,
    borderLeftWidth,
    borderRightWidth,
  } = getWin(ele)!.getComputedStyle(ele);

  const eleRect = ele.getBoundingClientRect();
  const {
    offsetHeight: eleOutHeight,
    clientHeight: eleInnerHeight,
    offsetWidth: eleOutWidth,
    clientWidth: eleInnerWidth,
  } = ele;

  const borderTopNum = getPxValue(borderTopWidth);
  const borderBottomNum = getPxValue(borderBottomWidth);
  const borderLeftNum = getPxValue(borderLeftWidth);
  const borderRightNum = getPxValue(borderRightWidth);

  const scaleX = toNum(Math.round((eleRect.width / eleOutWidth) * 1000) / 1000);
  const scaleY = toNum(
    Math.round((eleRect.height / eleOutHeight) * 1000) / 1000,
  );

  const eleScrollWidth =
    (eleOutWidth - eleInnerWidth - borderLeftNum - borderRightNum) * scaleX;
  const eleScrollHeight =
    (eleOutHeight - eleInnerHeight - borderTopNum - borderBottomNum) * scaleY;

  const scaledBorderTopWidth = borderTopNum * scaleY;
  const scaledBorderBottomWidth = borderBottomNum * scaleY;
  const scaledBorderLeftWidth = borderLeftNum * scaleX;
  const scaledBorderRightWidth = borderRightNum * scaleX;

  let clipMarginWidth = 0;
  let clipMarginHeight = 0;
  if (overflow === "clip") {
    const clipNum = getPxValue(overflowClipMargin);
    clipMarginWidth = clipNum * scaleX;
    clipMarginHeight = clipNum * scaleY;
  }

  return {
    left: eleRect.x + scaledBorderLeftWidth - clipMarginWidth,
    top: eleRect.y + scaledBorderTopWidth - clipMarginHeight,
    right:
      eleRect.x +
      eleRect.width +
      clipMarginWidth -
      scaledBorderRightWidth -
      eleScrollWidth,
    bottom:
      eleRect.y +
      eleRect.height +
      clipMarginHeight -
      scaledBorderBottomWidth -
      eleScrollHeight,
  };
}

function applyScrollerClip(area: VisibleArea, clip: VisibleArea) {
  area.left = Math.max(area.left, clip.left);
  area.top = Math.max(area.top, clip.top);
  area.right = Math.min(area.right, clip.right);
  area.bottom = Math.min(area.bottom, clip.bottom);
}

export function getVisibleAreas(
  areas: VisibleArea[],
  scrollerList?: HTMLElement[],
): VisibleArea[] {
  areas = areas.map((area) => ({ ...area }));
  (scrollerList || []).forEach((ele) => {
    const clip = getScrollerClip(ele);
    if (clip) {
      areas.forEach((area) => {
        applyScrollerClip(area, clip);
      });
    }
  });
  return areas;
}

export function getOffsetStyle(
  open: boolean,
  positionState: FloatingPositionState,
) {
  const AUTO = "auto";

  const offsetStyle: JSX.CSSProperties = {
    bottom: AUTO,
    left: "-1000vw",
    right: AUTO,
    top: "-1000vh",
  };

  if (positionState.ready || !open) {
    const { points, dynamicInset } = positionState.align ?? {};
    const alignRight = dynamicInset && points?.[0]?.[1] === "r";
    const alignBottom = dynamicInset && points?.[0]?.[0] === "b";

    if (alignRight) {
      offsetStyle.right = `${positionState.offsetR}px`;
      offsetStyle.left = AUTO;
    } else {
      offsetStyle.left = `${positionState.offsetX}px`;
      offsetStyle.right = AUTO;
    }

    if (alignBottom) {
      offsetStyle.bottom = `${positionState.offsetB}px`;
      offsetStyle.top = AUTO;
    } else {
      offsetStyle.top = `${positionState.offsetY}px`;
      offsetStyle.bottom = AUTO;
    }
  }

  return offsetStyle;
}

const LOG_OPTIONS = {
  package: "floating",
} as const;

export const error = (message: string) => _error(message, LOG_OPTIONS);

export const warning = (message: string) => _waring(message, LOG_OPTIONS);
