import { type Accessor, createEffect, createMemo, createSignal, untrack } from "solid-js";
import { isDOM, isVisible } from "@s-components/utils";
import type {
  FloatingAlign,
  FloatingContextValue,
  FloatingPlacements,
  FloatingPositionState,
} from "../FloatingContext";
import { collectScroller, getVisibleAreas, toNum } from "../utils";

type Rect = Record<"x" | "y" | "width" | "height", number>;
type Points = [topBottom: "t" | "b" | "c", leftRight: "l" | "r" | "c"];

type OffsetType = number | `${number}%`;

// =========================== helpers ============================
function getUnitOffset(size: number, offset: OffsetType = 0) {
  if (typeof offset === "number") return offset;
  const cells = offset.match(/^(.*)%$/);
  if (cells) {
    return size * (parseFloat(cells[1]) / 100);
  }
  return parseFloat(offset);
}

function getNumberOffset(
  rect: { width: number; height: number },
  offset?: [OffsetType, OffsetType],
): [number, number] {
  const [offsetX, offsetY] = offset || [];
  return [getUnitOffset(rect.width, offsetX), getUnitOffset(rect.height, offsetY)];
}

function splitPoints(points: string = ""): Points {
  return [points[0] as Points[0], points[1] as Points[1]];
}

function getAlignPoint(rect: Rect, points: Points) {
  const topBottom = points[0];
  const leftRight = points[1];

  let x: number;
  let y: number;

  if (topBottom === "t") y = rect.y;
  else if (topBottom === "b") y = rect.y + rect.height;
  else y = rect.y + rect.height / 2;

  if (leftRight === "l") x = rect.x;
  else if (leftRight === "r") x = rect.x + rect.width;
  else x = rect.x + rect.width / 2;

  return { x, y };
}

function reversePoints(points: Points, index: number): Points {
  const reverseMap: Record<string, string> = { t: "b", b: "t", l: "r", r: "l" };
  const clone = [...points] as Points;
  clone[index] = (reverseMap[points[index]] || "c") as Points[0];
  return clone;
}

function flatPoints(points: Points): string {
  return points.join("");
}

function shouldSwitchPlacement(
  isOverflow: boolean,
  isVisibleFirst: boolean,
  newVisibleArea: number,
  originVisibleArea: number,
  newRecommendArea: number,
  originRecommendArea: number,
) {
  if (isOverflow) {
    return (
      newVisibleArea > originVisibleArea ||
      (newVisibleArea === originVisibleArea &&
        (!isVisibleFirst || newRecommendArea >= originRecommendArea))
    );
  }

  return (
    newVisibleArea > originVisibleArea ||
    (isVisibleFirst &&
      newVisibleArea === originVisibleArea &&
      newRecommendArea > originRecommendArea)
  );
}

// =========================== createPosition ============================
export default function createPosition(
  open: Accessor<boolean>,
  popup: Accessor<HTMLElement | undefined>,
  target: Accessor<HTMLElement | [x: number, y: number] | undefined>,
  placement: Accessor<string>,
  placements: Accessor<FloatingPlacements>,
  popupAlign?: Accessor<FloatingAlign | undefined>,
) {
  const [position, setPosition] = createSignal<FloatingPositionState>({
    ready: false,
    offsetX: 0,
    offsetY: 0,
    offsetR: 0,
    offsetB: 0,
    arrowX: 0,
    arrowY: 0,
    scaleX: 1,
    scaleY: 1,
    align: placements()[placement()] || {},
  });

  let repositionCount = 0;
  const scrollerList = createMemo<HTMLElement[]>(() => {
    const popupEl = popup();
    if (!popupEl) return [];
    return collectScroller(popupEl);
  });

  let prevFlipRef: { tb?: boolean; bt?: boolean; lr?: boolean; rl?: boolean } = {};

  const resetFlipCache = () => {
    prevFlipRef = {};
  };

  let cacheTargetRect: { width: number; height: number } | null = null;
  let cacheScale: { scaleX: number; scaleY: number } | null = null;

  const updatePosition = (cache = false) => {
    if (cache && !cacheTargetRect) return false;

    const popupElement = popup();
    const targetValue = target();
    if (!popupElement || !targetValue || !open()) return false;

    const doc = popupElement.ownerDocument;
    const win = doc.defaultView || (doc as any).parentWindow;

    const popupComputedStyle = win.getComputedStyle(popupElement);
    const { position: popupPosition } = popupComputedStyle;

    const {
      left: originLeft,
      top: originTop,
      right: originRight,
      bottom: originBottom,
      overflow: originOverflow,
    } = popupElement.style;

    const placementInfo: FloatingAlign = {
      ...placements()[placement()],
      ...popupAlign?.(),
    };

    let targetRect: Rect;
    if (Array.isArray(targetValue)) {
      targetRect = { x: targetValue[0], y: targetValue[1], width: 0, height: 0 };
    } else {
      const targetRectInfo = targetValue.getBoundingClientRect();
      const rect = cache ? Object.assign(targetRectInfo, cacheTargetRect ?? {}) : targetRectInfo;
      if (!cache) {
        cacheTargetRect = { width: rect.width, height: rect.height };
      }
      rect.x = rect.x ?? rect.left;
      rect.y = rect.y ?? rect.top;
      targetRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }

    const placeholderElement = doc.createElement("div");
    placeholderElement.style.position = popupPosition;
    placeholderElement.style.left = `${popupElement.offsetLeft}px`;
    placeholderElement.style.top = `${popupElement.offsetTop}px`;
    placeholderElement.style.width = `${popupElement.offsetWidth}px`;
    placeholderElement.style.height = `${popupElement.offsetHeight}px`;
    popupElement.parentNode?.appendChild(placeholderElement);

    let rawPopupRect: DOMRect;
    let rawPopupMirrorRect: DOMRect;
    let clientWidth: number;
    let clientHeight: number;
    let scrollWidth: number;
    let scrollHeight: number;
    let scrollTop: number;
    let scrollLeft: number;
    try {
      popupElement.style.left = "0";
      popupElement.style.top = "0";
      popupElement.style.right = "auto";
      popupElement.style.bottom = "auto";
      popupElement.style.overflow = "hidden";

      rawPopupRect = popupElement.getBoundingClientRect();
      ({ clientWidth, clientHeight, scrollWidth, scrollHeight, scrollTop, scrollLeft } =
        doc.documentElement);

      popupElement.style.left = "auto";
      popupElement.style.top = "auto";
      popupElement.style.right = "0";
      popupElement.style.bottom = "0";

      rawPopupMirrorRect = popupElement.getBoundingClientRect();
    } finally {
      popupElement.style.left = originLeft;
      popupElement.style.top = originTop;
      popupElement.style.right = originRight;
      popupElement.style.bottom = originBottom;
      popupElement.style.overflow = originOverflow;
      popupElement.parentElement?.removeChild(placeholderElement);
    }

    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;

    const visibleRegion = { left: 0, top: 0, right: clientWidth, bottom: clientHeight };
    const scrollRegion = {
      left: -scrollLeft,
      top: -scrollTop,
      right: scrollWidth - scrollLeft,
      bottom: scrollHeight - scrollTop,
    };

    let { htmlRegion } = placementInfo;
    const VISIBLE = "visible" as const;
    const VISIBLE_FIRST = "visibleFirst" as const;
    if (htmlRegion !== "scroll" && htmlRegion !== VISIBLE_FIRST) {
      htmlRegion = VISIBLE;
    }
    const isVisibleFirst = htmlRegion === VISIBLE_FIRST;

    const [scrollRegionArea, visibleRegionArea] = getVisibleAreas(
      [scrollRegion, visibleRegion],
      scrollerList(),
    );

    const visibleArea = htmlRegion === VISIBLE ? visibleRegionArea : scrollRegionArea;
    const adjustCheckVisibleArea = isVisibleFirst ? visibleRegionArea : visibleArea;

    const popupRect = rawPopupRect;
    popupRect.x = popupRect.x ?? popupRect.left;
    popupRect.y = popupRect.y ?? popupRect.top;

    const { height, width } = popupComputedStyle;
    const popupHeight = popupRect.height;
    const popupWidth = popupRect.width;
    const popupMirrorRect = rawPopupMirrorRect;

    const scaleX =
      cache && cacheScale
        ? cacheScale.scaleX
        : toNum(Math.round((popupWidth / parseFloat(width)) * 1000) / 1000);
    const scaleY =
      cache && cacheScale
        ? cacheScale.scaleY
        : toNum(Math.round((popupHeight / parseFloat(height)) * 1000) / 1000);
    if (!cache) {
      cacheScale = { scaleX, scaleY };
    }

    if (scaleX === 0 || scaleY === 0 || (isDOM(targetValue) && !isVisible(targetValue))) {
      return false;
    }

    const placementOffset = placementInfo.offset;
    const placementTargetOffset = placementInfo.targetOffset;
    let [popupOffsetX, popupOffsetY] = getNumberOffset(
      popupRect,
      placementOffset as [OffsetType, OffsetType] | undefined,
    );
    const [targetOffsetX, targetOffsetY] = getNumberOffset(
      targetRect,
      placementTargetOffset as [OffsetType, OffsetType] | undefined,
    );

    targetRect.x -= targetOffsetX;
    targetRect.y -= targetOffsetY;

    const popupPoint = placementInfo.points?.[0];
    const targetPoint = placementInfo.points?.[1];
    const targetPoints = splitPoints(targetPoint);
    const popupPoints = splitPoints(popupPoint);

    const targetAlignPoint = getAlignPoint(targetRect, targetPoints);
    const popupAlignPoint = getAlignPoint(popupRect, popupPoints);

    const nextAlignInfo: FloatingAlign = { ...placementInfo };

    let nextPoints: [Points, Points] = [popupPoints, targetPoints];

    let nextOffsetX = targetAlignPoint.x - popupAlignPoint.x + popupOffsetX;
    let nextOffsetY = targetAlignPoint.y - popupAlignPoint.y + popupOffsetY;

    function getIntersectionVisibleArea(offX: number, offY: number, area = visibleArea) {
      const l = popupRect.x + offX;
      const t = popupRect.y + offY;
      const r = l + popupWidth;
      const b = t + popupHeight;

      const visibleL = Math.max(l, area.left);
      const visibleT = Math.max(t, area.top);
      const visibleR = Math.min(r, area.right);
      const visibleB = Math.min(b, area.bottom);

      return Math.max(0, (visibleR - visibleL) * (visibleB - visibleT));
    }

    const originIntersectionVisibleArea = getIntersectionVisibleArea(nextOffsetX, nextOffsetY);
    const originIntersectionRecommendArea = getIntersectionVisibleArea(
      nextOffsetX,
      nextOffsetY,
      visibleRegionArea,
    );

    const targetAlignPointTL = getAlignPoint(targetRect, splitPoints("tl"));
    const popupAlignPointTL = getAlignPoint(popupRect, splitPoints("tl"));
    const targetAlignPointBR = getAlignPoint(targetRect, splitPoints("br"));
    const popupAlignPointBR = getAlignPoint(popupRect, splitPoints("br"));

    const overflowConfig = placementInfo.overflow || {};
    const { adjustX, adjustY, shiftX, shiftY } = overflowConfig as any;

    const supportAdjust = (val: boolean | number | undefined) => {
      if (typeof val === "boolean") return val;
      return (val as number) >= 0;
    };

    let nextPopupY = 0;
    let nextPopupBottom = 0;
    let nextPopupX = 0;
    let nextPopupRight = 0;

    function syncNextPopupPosition() {
      nextPopupY = popupRect.y + nextOffsetY;
      nextPopupBottom = nextPopupY + popupHeight;
      nextPopupX = popupRect.x + nextOffsetX;
      nextPopupRight = nextPopupX + popupWidth;
    }
    syncNextPopupPosition();

    const needAdjustY = supportAdjust(adjustY);
    const sameTB = popupPoints[0] === targetPoints[0];

    if (
      needAdjustY &&
      popupPoints[0] === "t" &&
      (nextPopupBottom > adjustCheckVisibleArea.bottom || prevFlipRef.bt)
    ) {
      let tmpNextOffsetY = nextOffsetY;

      if (sameTB) {
        tmpNextOffsetY -= popupHeight - targetHeight;
      } else {
        tmpNextOffsetY = targetAlignPointTL.y - popupAlignPointBR.y - popupOffsetY;
      }

      const newVisibleArea = getIntersectionVisibleArea(nextOffsetX, tmpNextOffsetY);
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        nextOffsetX,
        tmpNextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        nextPopupBottom > adjustCheckVisibleArea.bottom,
        isVisibleFirst,
        newVisibleArea,
        originIntersectionVisibleArea,
        newVisibleRecommendArea,
        originIntersectionRecommendArea,
      );

      if (shouldFlip) {
        prevFlipRef.bt = true;
        nextOffsetY = tmpNextOffsetY;
        popupOffsetY = -popupOffsetY;
        nextPoints = [reversePoints(nextPoints[0], 0), reversePoints(nextPoints[1], 0)];
      } else {
        prevFlipRef.bt = false;
      }
    }

    if (
      needAdjustY &&
      popupPoints[0] === "b" &&
      (nextPopupY < adjustCheckVisibleArea.top || prevFlipRef.tb)
    ) {
      let tmpNextOffsetY = nextOffsetY;

      if (sameTB) {
        tmpNextOffsetY += popupHeight - targetHeight;
      } else {
        tmpNextOffsetY = targetAlignPointBR.y - popupAlignPointTL.y - popupOffsetY;
      }

      const newVisibleArea = getIntersectionVisibleArea(nextOffsetX, tmpNextOffsetY);
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        nextOffsetX,
        tmpNextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        nextPopupY < adjustCheckVisibleArea.top,
        isVisibleFirst,
        newVisibleArea,
        originIntersectionVisibleArea,
        newVisibleRecommendArea,
        originIntersectionRecommendArea,
      );

      if (shouldFlip) {
        prevFlipRef.tb = true;
        nextOffsetY = tmpNextOffsetY;
        popupOffsetY = -popupOffsetY;
        nextPoints = [reversePoints(nextPoints[0], 0), reversePoints(nextPoints[1], 0)];
      } else {
        prevFlipRef.tb = false;
      }
    }

    syncNextPopupPosition();

    const needAdjustX = supportAdjust(adjustX);
    const sameLR = popupPoints[1] === targetPoints[1];

    if (
      needAdjustX &&
      popupPoints[1] === "l" &&
      (nextPopupRight > adjustCheckVisibleArea.right || prevFlipRef.rl)
    ) {
      let tmpNextOffsetX = nextOffsetX;

      if (sameLR) {
        tmpNextOffsetX -= popupWidth - targetWidth;
      } else {
        tmpNextOffsetX = targetAlignPointTL.x - popupAlignPointBR.x - popupOffsetX;
      }

      const newVisibleArea = getIntersectionVisibleArea(tmpNextOffsetX, nextOffsetY);
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        tmpNextOffsetX,
        nextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        nextPopupRight > adjustCheckVisibleArea.right,
        isVisibleFirst,
        newVisibleArea,
        originIntersectionVisibleArea,
        newVisibleRecommendArea,
        originIntersectionRecommendArea,
      );

      if (shouldFlip) {
        prevFlipRef.rl = true;
        nextOffsetX = tmpNextOffsetX;
        popupOffsetX = -popupOffsetX;
        nextPoints = [reversePoints(nextPoints[0], 1), reversePoints(nextPoints[1], 1)];
      } else {
        prevFlipRef.rl = false;
      }
    }

    if (
      needAdjustX &&
      popupPoints[1] === "r" &&
      (nextPopupX < adjustCheckVisibleArea.left || prevFlipRef.lr)
    ) {
      let tmpNextOffsetX = nextOffsetX;

      if (sameLR) {
        tmpNextOffsetX += popupWidth - targetWidth;
      } else {
        tmpNextOffsetX = targetAlignPointBR.x - popupAlignPointTL.x - popupOffsetX;
      }

      const newVisibleArea = getIntersectionVisibleArea(tmpNextOffsetX, nextOffsetY);
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        tmpNextOffsetX,
        nextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        nextPopupX < adjustCheckVisibleArea.left,
        isVisibleFirst,
        newVisibleArea,
        originIntersectionVisibleArea,
        newVisibleRecommendArea,
        originIntersectionRecommendArea,
      );

      if (shouldFlip) {
        prevFlipRef.lr = true;
        nextOffsetX = tmpNextOffsetX;
        popupOffsetX = -popupOffsetX;
        nextPoints = [reversePoints(nextPoints[0], 1), reversePoints(nextPoints[1], 1)];
      } else {
        prevFlipRef.lr = false;
      }
    }

    const numShiftX = shiftX === true ? 0 : (shiftX as number);
    const numShiftY = shiftY === true ? 0 : (shiftY as number);

    if (typeof numShiftX === "number") {
      if (nextPopupX < visibleArea.left) {
        nextOffsetX -= nextPopupX - visibleArea.left - numShiftX;
      }
      if (nextPopupRight > visibleArea.right) {
        nextOffsetX -= nextPopupRight - visibleArea.right + numShiftX;
      }
    }

    if (typeof numShiftY === "number") {
      if (nextPopupY < visibleArea.top) {
        nextOffsetY -= nextPopupY - visibleArea.top - numShiftY;
      }
      if (nextPopupBottom > visibleArea.bottom) {
        nextOffsetY -= nextPopupBottom - visibleArea.bottom + numShiftY;
      }
    }

    const [nextPopupPoint, nextTargetPoint] = nextPoints;
    nextAlignInfo.points = [flatPoints(nextPopupPoint), flatPoints(nextTargetPoint)];

    const targetCenter = getAlignPoint(targetRect, splitPoints("cc"));

    let nextArrowX = targetCenter.x - (popupRect.x + nextOffsetX);
    let nextArrowY = targetCenter.y - (popupRect.y + nextOffsetY);

    if (nextPopupPoint[1] === "l") nextArrowX = 0;
    else if (nextPopupPoint[1] === "r") nextArrowX = popupWidth;

    if (nextPopupPoint[0] === "t") nextArrowY = 0;
    else if (nextPopupPoint[0] === "b") nextArrowY = popupHeight;

    if (popupMirrorRect.left > popupRect.left) {
      nextOffsetX += popupMirrorRect.left - popupRect.left;
    }
    const offsetX4Right = clientWidth - nextOffsetX - popupWidth;

    if (popupMirrorRect.top > popupRect.top) {
      nextOffsetY += popupMirrorRect.top - popupRect.top;
    }
    const offsetY4Bottom = clientHeight - nextOffsetY - popupHeight;

    if (scaleX === 1) {
      nextOffsetX = Math.floor(nextOffsetX);
    }
    let nextOffsetXForRight = offsetX4Right;
    if (scaleX === 1) {
      nextOffsetXForRight = Math.floor(offsetX4Right);
    }

    if (scaleY === 1) {
      nextOffsetY = Math.floor(nextOffsetY);
    }
    let nextOffsetYForBottom = offsetY4Bottom;
    if (scaleY === 1) {
      nextOffsetYForBottom = Math.floor(offsetY4Bottom);
    }

    const nextPositionState: FloatingPositionState = {
      ready: true,
      offsetX: nextOffsetX / scaleX,
      offsetY: nextOffsetY / scaleY,
      offsetR: nextOffsetXForRight / scaleX,
      offsetB: nextOffsetYForBottom / scaleY,
      arrowX: nextArrowX / scaleX,
      arrowY: nextArrowY / scaleY,
      scaleX,
      scaleY,
      align: nextAlignInfo,
    };

    setPosition(nextPositionState);
    return true;
  };

  const reposition: FloatingContextValue["reposition"] = (cache?: boolean) => {
    repositionCount += 1;
    const id = repositionCount;

    return new Promise((resolve, reject) => {
      Promise.resolve().then(() => {
        if (repositionCount !== id) {
          resolve("superseded");
          return;
        }

        try {
          resolve(updatePosition(cache) ? "updated" : "skipped");
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  createEffect(() => {
    const ele = popup();
    untrack(() => {
      if (ele && open()) {
        void reposition();
      }
    });
  });

  const resetReady = () => {
    setPosition((cur) => ({ ...cur, ready: false }));
  };

  createEffect(() => {
    placement();
    resetReady();
  });

  createEffect(() => {
    if (!open()) {
      resetFlipCache();
      resetReady();
    }
  });

  return [position, reposition] as const;
}
