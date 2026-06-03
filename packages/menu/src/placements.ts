import type { FloatingPlacements } from "@solid-component/floating";

export const MENU_POPUP_PLACEMENTS = {
  "right": {
    points: ["tl", "tr"],
    offset: [4, 0],
    overflow: {
      adjustX: true,
      adjustY: true,
    },
  },
  "left": {
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
