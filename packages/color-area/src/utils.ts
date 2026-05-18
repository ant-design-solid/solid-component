import { ColorInput, FastColor, RGB } from "./fast-color";

export interface RGBA extends RGB {
  a: number;
}

export interface HSB {
  h: number;
  s: number;
  b: number;
}

export interface HSBA extends HSB {
  a: number;
}

export type ColorGenInput<T = Color> = string | number | RGB | RGBA | HSB | HSBA | T;

export type ColorValue<T = Color> = T | string;

export type ColorFormatType = "hex" | "rgb" | "hsb";

function toColorInput(input: ColorGenInput) {
  if (input && typeof input === "object" && "h" in input && "b" in input) {
    const { b, ...resets } = input as HSB;
    return {
      ...resets,
      v: b,
    };
  }
  return input as ColorInput;
}

const round = Math.round;

export class Color extends FastColor {
  constructor(input: ColorGenInput) {
    super(toColorInput(input));
  }
  toHsb() {
    const { v, ...resets } = this.toHsv();
    return {
      ...resets,
      b: v,
      a: this.a,
    };
  }

  toHsbString() {
    const hsb = this.toHsb();

    return hsb.a === 1
      ? `hsb(${round(hsb.h)}, ${round(hsb.s * 100)}%, ${round(hsb.b * 100)}%)`
      : `hsba(${round(hsb.h)}, ${round(hsb.s * 100)}%, ${round(hsb.b * 100)}%, ${hsb.a.toFixed(hsb.a === 0 ? 0 : 2)})`;
  }
}

export function generateColor(color: ColorGenInput) {
  return color instanceof Color ? color : new Color(color);
}

export function formatColorValue(
  color: Color,
  valueFormat?: ColorFormatType | ((value: Color) => string),
) {
  if (!valueFormat) {
    return color;
  }

  if (typeof valueFormat === "function") {
    return valueFormat(color);
  }

  switch (valueFormat) {
    case "hex":
      return color.toHexString();
    case "hsb":
      return color.toHsbString();
    case "rgb":
    default:
      return color.toRgbString();
  }
}

export interface TransformOffset {
  x: number;
  y: number;
}

export function toColor(offset: TransformOffset, color: Color) {
  const hsb = color.toHsb();

  return generateColor({
    h: hsb.h,
    s: offset.x / 100,
    // 色板纵轴控制亮度，越靠下亮度越低。
    b: 1 - offset.y / 100,
    a: hsb.a,
  });
}

export function toOffset(color: Color) {
  const hsb = color.toHsb();

  return {
    x: hsb.s * 100,
    y: (1 - hsb.b) * 100,
  };
}
