import type { FloatingPlacements } from "@solid-component/floating";
import { MenuDirection, MenuMode } from "./types";

export const resolvePlacement = (
  mode: MenuMode,
  direction: MenuDirection,
  depth: number,
) => {
  const rtl = direction === MenuDirection.rtl;
  if (mode === MenuMode.horizontal && depth === 1) {
    return rtl ? "bottom-end" : "bottom-start";
  }
  return rtl ? "left" : "right";
};

export const MENU_POPUP_PLACEMENTS = {
  right: {
    points: ["tl", "tr"],
    offset: [4, 0],
    overflow: {
      adjustX: true,
      adjustY: true,
    },
  },
  left: {
    points: ["tr", "tl"],
    offset: [-4, 0],
    overflow: {
      adjustX: true,
      adjustY: true,
    },
  },
  "bottom-start": {
    points: ["tl", "bl"],
    offset: [0, 4],
    overflow: {
      adjustX: true,
      adjustY: true,
    },
  },
  "bottom-end": {
    points: ["tr", "br"],
    offset: [0, 4],
    overflow: {
      adjustX: true,
      adjustY: true,
    },
  },
} satisfies FloatingPlacements;
