import { isVisible } from "@solid-component/utils";
import { $DISCARD, createTaskQueue } from "@solid-primitive/scheduler";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from "solid-js";
import type {
  FloatingAlign,
  FloatingContextValue,
  FloatingPlacements,
  FloatingPositionState,
} from "../FloatingContext";
import { collectScroller, getVisibleAreas, getWin, toNum } from "../utils";

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
  return [
    getUnitOffset(rect.width, offsetX),
    getUnitOffset(rect.height, offsetY),
  ];
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

const reverseMap: Record<string, string> = { t: "b", b: "t", l: "r", r: "l" };

function reversePoints(points: Points, index: number): Points {
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

// =========================== createFloating ============================
export default function createFloating(
  open: Accessor<boolean>,
  popup: Accessor<HTMLElement | undefined>,
  target: Accessor<HTMLElement | [x: number, y: number] | undefined>,
  placement: Accessor<string>,
  placements: Accessor<FloatingPlacements>,
  popupAlign?: Accessor<FloatingAlign | undefined>,
  onFloating?: (el: any, align: any) => void,
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

  const scrollerList = createMemo<HTMLElement[]>(() => {
    const popupEl = popup();
    if (!popupEl) return [];
    return collectScroller(popupEl);
  });
  const repositionQueue = createTaskQueue({
    strategy: "latest",
  });

  let prevFlipRef: { tb?: boolean; bt?: boolean; lr?: boolean; rl?: boolean } =
    {};

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
    const win = getWin(popupElement);
    if (!win) return false;

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

    const placeholderElement = doc.createElement("div");
    popupElement.parentNode?.appendChild(placeholderElement);
    placeholderElement.style.position = popupPosition;
    placeholderElement.style.left = `${popupElement.offsetLeft}px`;
    placeholderElement.style.top = `${popupElement.offsetTop}px`;
    placeholderElement.style.width = `${popupElement.offsetWidth}px`;
    placeholderElement.style.height = `${popupElement.offsetHeight}px`;

    // Reset

    popupElement.style.left = "0";
    popupElement.style.top = "0";
    popupElement.style.right = "auto";
    popupElement.style.bottom = "auto";
    popupElement.style.overflow = "hidden";

    let targetRect: Rect;
    if (Array.isArray(targetValue)) {
      targetRect = {
        x: targetValue[0],
        y: targetValue[1],
        width: 0,
        height: 0,
      };
    } else {
      const targetRectInfo = targetValue.getBoundingClientRect();
      const rect = cache
        ? Object.assign(targetRectInfo, cacheTargetRect ?? {})
        : targetRectInfo;
      if (!cache) {
        cacheTargetRect = { width: rect.width, height: rect.height };
      }
      rect.x = rect.x ?? rect.left;
      rect.y = rect.y ?? rect.top;
      targetRect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }

    const rawPopupRect = popupElement.getBoundingClientRect();
    const {
      clientWidth,
      clientHeight,
      scrollWidth,
      scrollHeight,
      scrollTop,
      scrollLeft,
    } = doc.documentElement;

    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;

    const visibleRegion = {
      left: 0,
      top: 0,
      right: clientWidth,
      bottom: clientHeight,
    };
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

    const visibleArea =
      htmlRegion === VISIBLE ? visibleRegionArea : scrollRegionArea;

    const adjustCheckVisibleArea = isVisibleFirst
      ? visibleRegionArea
      : visibleArea;

    // Record right & bottom align data
    popupElement.style.left = "auto";
    popupElement.style.top = "auto";
    popupElement.style.right = "0";
    popupElement.style.bottom = "0";

    const rawPopupMirrorRect = popupElement.getBoundingClientRect();

    // Reset back
    popupElement.style.left = originLeft;
    popupElement.style.top = originTop;
    popupElement.style.right = originRight;
    popupElement.style.bottom = originBottom;
    popupElement.style.overflow = originOverflow;

    popupElement.parentElement?.removeChild(placeholderElement);

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

    if (
      scaleX === 0 ||
      scaleY === 0 ||
      (!Array.isArray(targetValue) && !isVisible(targetValue))
    ) {
      return false;
    }

    const { offset: placementOffset, targetOffset: placementTargetOffset } =
      placementInfo;
    let [popupOffsetX, popupOffsetY] = getNumberOffset(
      popupRect,
      placementOffset,
    );
    const [targetOffsetX, targetOffsetY] = getNumberOffset(
      targetRect,
      placementTargetOffset,
    );

    targetRect.x -= targetOffsetX;
    targetRect.y -= targetOffsetY;

    const [popupPoint, targetPoint] = placementInfo.points ?? [];
    const targetPoints = splitPoints(targetPoint);
    const popupPoints = splitPoints(popupPoint);

    const targetAlignPoint = getAlignPoint(targetRect, targetPoints);
    const popupAlignPoint = getAlignPoint(popupRect, popupPoints);

    const nextAlignInfo = { ...placementInfo };

    let nextPoints = [popupPoints, targetPoints];

    let nextOffsetX = targetAlignPoint.x - popupAlignPoint.x + popupOffsetX;
    let nextOffsetY = targetAlignPoint.y - popupAlignPoint.y + popupOffsetY;

    function getIntersectionVisibleArea(
      offX: number,
      offY: number,
      area = visibleArea,
    ) {
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

    const originIntersectionVisibleArea = getIntersectionVisibleArea(
      nextOffsetX,
      nextOffsetY,
    );
    const originIntersectionRecommendArea = getIntersectionVisibleArea(
      nextOffsetX,
      nextOffsetY,
      visibleRegionArea,
    );

    const tl: Points = ["t", "l"] as const;
    const br: Points = ["b", "r"] as const;
    const targetAlignPointTL = getAlignPoint(targetRect, tl);
    const popupAlignPointTL = getAlignPoint(popupRect, tl);
    const targetAlignPointBR = getAlignPoint(targetRect, br);
    const popupAlignPointBR = getAlignPoint(popupRect, br);

    const overflowConfig = placementInfo.overflow || {};
    const { adjustX, adjustY, shiftX, shiftY } = overflowConfig as any;

    const supportAdjust = (val: boolean | number) => {
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

    const overflowBottom = nextPopupBottom > adjustCheckVisibleArea.bottom;
    if (
      needAdjustY &&
      popupPoints[0] === "t" &&
      (overflowBottom || prevFlipRef.bt)
    ) {
      let tmpNextOffsetY = nextOffsetY;

      if (sameTB) {
        tmpNextOffsetY -= popupHeight - targetHeight;
      } else {
        tmpNextOffsetY =
          targetAlignPointTL.y - popupAlignPointBR.y - popupOffsetY;
      }

      const newVisibleArea = getIntersectionVisibleArea(
        nextOffsetX,
        tmpNextOffsetY,
      );
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        nextOffsetX,
        tmpNextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        overflowBottom,
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
        nextPoints = [
          reversePoints(nextPoints[0], 0),
          reversePoints(nextPoints[1], 0),
        ];
      } else {
        prevFlipRef.bt = false;
      }
    }

    const overflowTop = nextPopupY < adjustCheckVisibleArea.top;
    if (
      needAdjustY &&
      popupPoints[0] === "b" &&
      (overflowTop || prevFlipRef.tb)
    ) {
      let tmpNextOffsetY = nextOffsetY;

      if (sameTB) {
        tmpNextOffsetY += popupHeight - targetHeight;
      } else {
        tmpNextOffsetY =
          targetAlignPointBR.y - popupAlignPointTL.y - popupOffsetY;
      }

      const newVisibleArea = getIntersectionVisibleArea(
        nextOffsetX,
        tmpNextOffsetY,
      );
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        nextOffsetX,
        tmpNextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        overflowTop,
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
        nextPoints = [
          reversePoints(nextPoints[0], 0),
          reversePoints(nextPoints[1], 0),
        ];
      } else {
        prevFlipRef.tb = false;
      }
    }

    syncNextPopupPosition();

    const needAdjustX = supportAdjust(adjustX);

    const sameLR = popupPoints[1] === targetPoints[1];

    const overflowRight = nextPopupRight > adjustCheckVisibleArea.right;
    if (
      needAdjustX &&
      popupPoints[1] === "l" &&
      (overflowRight || prevFlipRef.rl)
    ) {
      let tmpNextOffsetX = nextOffsetX;

      if (sameLR) {
        tmpNextOffsetX -= popupWidth - targetWidth;
      } else {
        tmpNextOffsetX =
          targetAlignPointTL.x - popupAlignPointBR.x - popupOffsetX;
      }

      const newVisibleArea = getIntersectionVisibleArea(
        tmpNextOffsetX,
        nextOffsetY,
      );
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        tmpNextOffsetX,
        nextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        overflowRight,
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
        nextPoints = [
          reversePoints(nextPoints[0], 1),
          reversePoints(nextPoints[1], 1),
        ];
      } else {
        prevFlipRef.rl = false;
      }
    }

    const overflowLeft = nextPopupX < adjustCheckVisibleArea.left;
    if (
      needAdjustX &&
      popupPoints[1] === "r" &&
      (overflowLeft || prevFlipRef.lr)
    ) {
      let tmpNextOffsetX = nextOffsetX;

      if (sameLR) {
        tmpNextOffsetX += popupWidth - targetWidth;
      } else {
        tmpNextOffsetX =
          targetAlignPointBR.x - popupAlignPointTL.x - popupOffsetX;
      }

      const newVisibleArea = getIntersectionVisibleArea(
        tmpNextOffsetX,
        nextOffsetY,
      );
      const newVisibleRecommendArea = getIntersectionVisibleArea(
        tmpNextOffsetX,
        nextOffsetY,
        visibleRegionArea,
      );

      const shouldFlip = shouldSwitchPlacement(
        overflowLeft,
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

        nextPoints = [
          reversePoints(nextPoints[0], 1),
          reversePoints(nextPoints[1], 1),
        ];
      } else {
        prevFlipRef.lr = false;
      }
    }

    nextAlignInfo.points = [
      flatPoints(nextPoints[0]),
      flatPoints(nextPoints[1]),
    ];

    // shift
    syncNextPopupPosition();

    const numShiftX = shiftX === true ? 0 : (shiftX as number);
    const numShiftY = shiftY === true ? 0 : (shiftY as number);

    if (typeof numShiftX === "number") {
      if (nextPopupX < visibleRegionArea.left) {
        // 左侧挤压修正时需要保留 placement 原始横向偏移，避免被 shift 阈值错误覆盖。
        nextOffsetX -= nextPopupX - visibleRegionArea.left - popupOffsetX;

        if (targetRect.x + targetWidth < visibleRegionArea.left + numShiftX) {
          nextOffsetX +=
            targetRect.x - visibleRegionArea.left + targetWidth - numShiftX;
        }
      }
      // Right
      if (nextPopupRight > visibleRegionArea.right) {
        nextOffsetX -= nextPopupRight - visibleRegionArea.right - popupOffsetX;

        if (targetRect.x > visibleRegionArea.right - numShiftX) {
          nextOffsetX += targetRect.x - visibleRegionArea.right + numShiftX;
        }
      }
    }

    if (typeof numShiftY === "number") {
      if (nextPopupY < visibleRegionArea.top) {
        nextOffsetY -= nextPopupY - visibleRegionArea.top - popupOffsetY;

        // When target if far away from visible area
        // Stop shift
        if (targetRect.y + targetHeight < visibleRegionArea.top + numShiftY) {
          nextOffsetY +=
            targetRect.y - visibleRegionArea.top + targetHeight - numShiftY;
        }
      }

      // Bottom
      if (nextPopupBottom > visibleRegionArea.bottom) {
        nextOffsetY -=
          nextPopupBottom - visibleRegionArea.bottom - popupOffsetY;

        if (targetRect.y > visibleRegionArea.bottom - numShiftY) {
          nextOffsetY += targetRect.y - visibleRegionArea.bottom + numShiftY;
        }
      }
    }

    // Arrow
    const popupLeft = popupRect.x + nextOffsetX;
    const popupRight = popupLeft + popupWidth;
    const popupTop = popupRect.y + nextOffsetY;
    const popupBottom = popupTop + popupHeight;

    const targetLeft = targetRect.x;
    const targetRight = targetLeft + targetWidth;
    const targetTop = targetRect.y;
    const targetBottom = targetTop + targetHeight;

    /** Max left of the popup and target element */
    const maxLeft = Math.max(popupLeft, targetLeft);
    /** Min right of the popup and target element */
    const minRight = Math.min(popupRight, targetRight);

    /** The center X of popup & target cross area */
    const xCenter = (maxLeft + minRight) / 2;
    /** Arrow X of popup offset */
    const nextArrowX = xCenter - popupLeft;

    const maxTop = Math.max(popupTop, targetTop);
    const minBottom = Math.min(popupBottom, targetBottom);

    const yCenter = (maxTop + minBottom) / 2;
    const nextArrowY = yCenter - popupTop;

    onFloating?.(popupElement, nextAlignInfo);

    // Additional calculate right & bottom position
    let offsetX4Right =
      popupMirrorRect.right - popupRect.x - (nextOffsetX + popupRect.width);
    let offsetY4Bottom =
      popupMirrorRect.bottom - popupRect.y - (nextOffsetY + popupRect.height);

    if (scaleX === 1) {
      nextOffsetX = Math.floor(nextOffsetX);
      offsetX4Right = Math.floor(offsetX4Right);
    }

    if (scaleY === 1) {
      nextOffsetY = Math.floor(nextOffsetY);
      offsetY4Bottom = Math.floor(offsetY4Bottom);
    }
    const nextPositionState: FloatingPositionState = {
      ready: true,
      offsetX: nextOffsetX / scaleX,
      offsetY: nextOffsetY / scaleY,
      offsetR: offsetX4Right / scaleX,
      offsetB: offsetY4Bottom / scaleY,
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
    // 定位请求高频且只关心最后一次结果，用覆盖型批处理避免重复测量。
    return repositionQueue
      .submit(() => (updatePosition(cache) ? "updated" : "skipped"))
      .then((value) => (value === $DISCARD ? "superseded" : value));
  };

  createEffect(() => {
    const popupElement = popup();
    const isOpen = open();
    const targetValue = target();
    placement();
    placements();
    popupAlign?.();

    if (!popupElement || !isOpen || !targetValue) {
      return;
    }

    // 对齐依赖变化后自动重算，避免只重置 ready 却没有触发新的定位。
    untrack(() => {
      void reposition();
    });
  });

  const resetReady = () => {
    setPosition((cur) => ({ ...cur, ready: false }));
  };

  createEffect(() => {
    placement();
    if (!open()) {
      resetReady();
    }
  });

  createEffect(() => {
    if (!open()) {
      resetFlipCache();
      resetReady();
    }
  });

  return [position, reposition] as const;
}
