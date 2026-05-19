import type { Color } from "./Color";

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
  a?: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
  a?: number;
}

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsv";

export type ColorInput = string | RGB | HSL | HSV | Color;
