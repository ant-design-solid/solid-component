import type { Color } from "@solid-component/utils";
import type { JSX } from "solid-js";

export type ColorSliderType = "hue" | "alpha" | "value";

export interface ColorSliderStrategy {
  min: number;
  max: number;
  step: number;
  getValue: (color: Color) => number;
  setValue: (color: Color, next: number) => Color;
  getRailStyle: (color: Color) => JSX.CSSProperties;
  getThumbColor: (color: Color) => string;
  getValueText: (color: Color) => string;
}

const HUE_RAIL_BACKGROUND =
  "linear-gradient(90deg, rgb(255, 0, 0) 0%, rgb(255, 255, 0) 16.667%, rgb(0, 255, 0) 33.333%, rgb(0, 255, 255) 50%, rgb(0, 0, 255) 66.667%, rgb(255, 0, 255) 83.333%, rgb(255, 0, 0) 100%)";

const ALPHA_CHECKERBOARD =
  "linear-gradient(45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.08) 75%), linear-gradient(45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.08) 75%)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const COLOR_SLIDER_STRATEGIES: Record<
  ColorSliderType,
  ColorSliderStrategy
> = {
  hue: {
    min: 0,
    max: 360,
    step: 1,
    getValue: (color) => color.toHsv().h,
    setValue: (color, next) => color.withHsv({ h: clamp(next, 0, 360) }),
    getRailStyle: () => ({
      background: HUE_RAIL_BACKGROUND,
    }),
    getThumbColor: (color) =>
      color
        .withHsv({
          s: 1,
          v: 1,
          a: 1,
        })
        .format("rgb"),
    getValueText: (color) => `Hue ${Math.round(color.toHsv().h)} degrees`,
  },
  alpha: {
    min: 0,
    max: 100,
    step: 1,
    getValue: (color) => color.toHsv().a! * 100,
    setValue: (color, next) => color.withHsv({ a: clamp(next, 0, 100) / 100 }),
    getRailStyle: (color) => {
      const transparent = color.withHsv({ a: 0 }).format("rgb");
      const solid = color.withHsv({ a: 1 }).format("rgb");
      return {
        "background-color": "#fff",
        "background-image": `linear-gradient(90deg, ${transparent} 0%, ${solid} 100%), ${ALPHA_CHECKERBOARD}`,
        "background-size": "100% 100%, 8px 8px, 8px 8px",
        "background-position": "0 0, 0 0, 4px 4px",
      };
    },
    getThumbColor: (color) => color.withHsv({ a: 1 }).format("rgb"),
    getValueText: (color) =>
      `Alpha ${Math.round(color.toHsv().a! * 100)} percent`,
  },
  value: {
    min: 0,
    max: 100,
    step: 1,
    getValue: (color) => color.toHsv().v * 100,
    setValue: (color, next) => color.withHsv({ v: clamp(next, 0, 100) / 100 }),
    getRailStyle: (color) => {
      const base = color.withHsv({ v: 1, a: 1 }).format("rgb");
      return {
        background: `linear-gradient(90deg, rgb(0, 0, 0) 0%, ${base} 100%)`,
      };
    },
    getThumbColor: (color) => color.withHsv({ a: 1 }).format("rgb"),
    getValueText: (color) =>
      `Brightness ${Math.round(color.toHsv().v * 100)} percent`,
  },
};
