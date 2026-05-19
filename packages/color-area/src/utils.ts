import { Color } from "@solid-component/utils";

export interface TransformOffset {
  x: number;
  y: number;
}

export function applyOffset(color: Color, offset: TransformOffset) {
  return color.withHsv({
    s: offset.x / 100,
    // 色板纵轴控制亮度，越靠下亮度越低。
    v: 1 - offset.y / 100,
  });
}

export function toOffset(color: Color): TransformOffset {
  const hsv = color.toHsv();

  return {
    x: hsv.s * 100,
    y: (1 - hsv.v) * 100,
  };
}

export { Color };
