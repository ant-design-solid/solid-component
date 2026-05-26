import presetColors from "./presetColors";
import type { ColorFormat, ColorInput, HSL, HSV, RGB } from "./types";

type Constructor<T> = new (...args: any[]) => T;

type ParseNumber = (num: number, txt: string, index: number) => number;

const round = Math.round;

interface HSVA extends Required<HSV> {}

/**
 * Support format, alpha unit will check the % mark:
 * - rgba(102, 204, 255, .5)      -> [102, 204, 255, 0.5]
 * - rgb(102 204 255 / .5)        -> [102, 204, 255, 0.5]
 * - rgb(100%, 50%, 0% / 50%)     -> [255, 128, 0, 0.5]
 * - hsl(270, 60, 40, .5)         -> [270, 60, 40, 0.5]
 * - hsl(270deg 60% 40% / 50%)    -> [270, 60, 40, 0.5]
 */
function splitColorStr(str: string, parseNum: ParseNumber): number[] {
  const match: string[] =
    str
      .replace(/^[^(]*\((.*)/, "$1")
      .replace(/\).*/, "")
      .match(/\d*\.?\d+%?/g) || [];
  const numList = match.map((item) => parseFloat(item));

  for (let i = 0; i < 3; i += 1) {
    numList[i] = parseNum(numList[i] || 0, match[i] || "", i);
  }

  if (match[3]) {
    numList[3] = match[3].includes("%") ? numList[3] / 100 : numList[3];
  } else {
    numList[3] = 1;
  }

  return numList;
}

const parseHueUnit: ParseNumber = (num, _, index) =>
  index === 0 ? num : num / 100;

const clamp = (num: number, min: number, max: number) =>
  Math.max(min, Math.min(max, num));

function limitRange(value: number, max?: number) {
  return clamp(value, 0, max || 255);
}

function normalizeHue(value: number) {
  return ((value % 360) + 360) % 360;
}

function normalizeHsva(value: Partial<HSVA>): HSVA {
  return {
    h: round(normalizeHue(value.h ?? 0)),
    s: limitRange(value.s ?? 0, 1),
    v: limitRange(value.v ?? 0, 1),
    a: limitRange(value.a ?? 1, 1),
  };
}

function rgbToHsva({ r, g, b, a = 1 }: RGB): HSVA {
  const rr = limitRange(r) / 255;
  const gg = limitRange(g) / 255;
  const bb = limitRange(b) / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rr) {
      h = 60 * (((gg - bb) / delta) % 6);
    } else if (max === gg) {
      h = 60 * ((bb - rr) / delta + 2);
    } else {
      h = 60 * ((rr - gg) / delta + 4);
    }
  }

  return {
    h: round(normalizeHue(h)),
    s: max === 0 ? 0 : delta / max,
    v: max,
    a: limitRange(a, 1),
  };
}

function hsvaToRgb({ h, s, v, a }: HSVA): RGB {
  const hue = normalizeHue(h);
  const chroma = v * s;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = v - chroma;

  let r = 0;
  let g = 0;
  let b = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r = chroma;
    g = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    r = x;
    g = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    g = chroma;
    b = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    g = x;
    b = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return {
    r: round((r + match) * 255),
    g: round((g + match) * 255),
    b: round((b + match) * 255),
    a,
  };
}

function hsvaToHsl({ h, s, v, a }: HSVA): HSL {
  const l = v * (1 - s / 2);
  const nextS = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);

  return {
    h: round(h),
    s: nextS,
    l,
    a,
  };
}

function hslToHsva({ h: inputHue, s, l, a }: HSL): HSVA {
  const h = normalizeHue(inputHue);
  const v = l + s * Math.min(l, 1 - l);
  const nextS = v === 0 ? 0 : 2 * (1 - l / v);

  return {
    h: round(h),
    s: limitRange(nextS, 1),
    v: limitRange(v, 1),
    a: typeof a === "number" ? limitRange(a, 1) : 1,
  };
}

function formatAlpha(alpha: number) {
  return Number(alpha.toFixed(3)).toString();
}

export class Color {
  private hsva: HSVA = {
    h: 0,
    s: 0,
    v: 0,
    a: 1,
  };

  private _rgb?: RGB;
  private _hsl?: HSL;
  private _luminance?: number;
  private _brightness?: number;

  constructor(input: ColorInput) {
    if (!input) {
      return;
    }

    if (typeof input === "string") {
      this.hsva = this.parseString(input);
      return;
    }

    if (input instanceof Color) {
      this.hsva = input.toHsv() as HSVA;
      return;
    }

    if ("v" in input) {
      this.hsva = normalizeHsva({
        h: input.h,
        s: input.s,
        v: input.v,
        a: input.a,
      });
      return;
    }

    if ("l" in input) {
      this.hsva = hslToHsva(input);
      return;
    }

    if ("r" in input) {
      this.hsva = rgbToHsva(input);
      return;
    }

    throw new Error(
      "@solid-component/color: unsupported input " + JSON.stringify(input),
    );
  }

  withHsv(value: Partial<HSV>) {
    return this._c(
      normalizeHsva({
        ...this.hsva,
        ...value,
      }),
    );
  }

  getLuminance(): number {
    if (typeof this._luminance === "undefined") {
      const { r, g, b } = this.toRgb();
      const adjustGamma = (raw: number) => {
        const value = raw / 255;
        return value <= 0.03928
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4);
      };

      this._luminance =
        0.2126 * adjustGamma(r) +
        0.7152 * adjustGamma(g) +
        0.0722 * adjustGamma(b);
    }

    return this._luminance;
  }

  getBrightness(): number {
    if (typeof this._brightness === "undefined") {
      const { r, g, b } = this.toRgb();
      this._brightness = (r * 299 + g * 587 + b * 114) / 1000;
    }

    return this._brightness;
  }

  darken(amount = 10) {
    const hsl = this.toHsl();
    return this._c({
      ...hsl,
      l: limitRange(hsl.l - amount / 100, 1),
    });
  }

  lighten(amount = 10) {
    const hsl = this.toHsl();
    return this._c({
      ...hsl,
      l: limitRange(hsl.l + amount / 100, 1),
    });
  }

  mix(input: ColorInput, amount = 50) {
    const current = this.toRgb();
    const next = this._c(input).toRgb();
    const p = amount / 100;

    return this._c({
      r: round((next.r - current.r) * p + current.r),
      g: round((next.g - current.g) * p + current.g),
      b: round((next.b - current.b) * p + current.b),
      a:
        round(
          ((next.a ?? 1) - (current.a ?? 1)) * p * 100 + (current.a ?? 1) * 100,
        ) / 100,
    });
  }

  tint(amount = 10) {
    return this.mix({ r: 255, g: 255, b: 255, a: 1 }, amount);
  }

  shade(amount = 10) {
    return this.mix({ r: 0, g: 0, b: 0, a: 1 }, amount);
  }

  onBackground(background: ColorInput) {
    const foreground = this.toRgb();
    const bg = this._c(background).toRgb();
    const alpha = foreground.a! + bg.a! * (1 - foreground.a!);

    const blend = (foregroundChannel: number, backgroundChannel: number) =>
      round(
        (foregroundChannel * foreground.a! +
          backgroundChannel * bg.a! * (1 - foreground.a!)) /
          alpha,
      );

    return this._c({
      r: blend(foreground.r, bg.r),
      g: blend(foreground.g, bg.g),
      b: blend(foreground.b, bg.b),
      a: alpha,
    });
  }

  isDark(): boolean {
    return this.getBrightness() < 128;
  }

  isLight(): boolean {
    return this.getBrightness() >= 128;
  }

  equals(other: Color): boolean {
    const current = this.toHsv();
    const next = other.toHsv();

    return (
      current.h === next.h &&
      current.s === next.s &&
      current.v === next.v &&
      current.a === next.a
    );
  }

  clone(): this {
    return this._c(this.hsva);
  }

  toHsl(): HSL {
    if (!this._hsl) {
      this._hsl = hsvaToHsl(this.hsva);
    }

    return {
      ...this._hsl,
    };
  }

  toHsv(): HSV {
    return {
      ...this.hsva,
    };
  }

  toRgb(): RGB {
    if (!this._rgb) {
      this._rgb = hsvaToRgb(this.hsva);
    }

    return {
      ...this._rgb,
    };
  }

  format(format: ColorFormat): string {
    switch (format) {
      case "hex":
        return this.toHexString();
      case "hsl":
        return this.toHslString();
      case "hsv":
        return this.toHsvString();
      case "rgb":
      default:
        return this.toRgbString();
    }
  }

  private _c(input: ColorInput): this {
    return new (this.constructor as Constructor<this>)(input);
  }

  private parseString(input: string): HSVA {
    const trimStr = input.trim();

    if (/^#?[A-F\d]{3,8}$/i.test(trimStr)) {
      return this.parseHexString(trimStr);
    }

    if (trimStr.startsWith("rgb")) {
      return this.parseRgbString(trimStr);
    }

    if (trimStr.startsWith("hsl")) {
      return this.parseHslString(trimStr);
    }

    if (trimStr.startsWith("hsv")) {
      return this.parseHsvString(trimStr);
    }

    const presetColor = (presetColors as Record<string, string>)[
      trimStr.toLowerCase()
    ];
    if (presetColor) {
      return this.parseHexString(
        parseInt(presetColor, 36).toString(16).padStart(6, "0"),
      );
    }

    throw new Error(
      `@solid-component/color: unsupported color string ${input}`,
    );
  }

  private parseHexString(input: string): HSVA {
    const value = input.replace("#", "");

    const readHexPair = (start: number, end?: number) =>
      parseInt(value[start] + value[end ?? start], 16);

    if (value.length < 6) {
      return rgbToHsva({
        r: readHexPair(0),
        g: readHexPair(1),
        b: readHexPair(2),
        a: value[3] ? readHexPair(3) / 255 : 1,
      });
    }

    return rgbToHsva({
      r: readHexPair(0, 1),
      g: readHexPair(2, 3),
      b: readHexPair(4, 5),
      a: value[6] ? readHexPair(6, 7) / 255 : 1,
    });
  }

  private parseHsvString(input: string): HSVA {
    const cells = splitColorStr(input, parseHueUnit);

    return normalizeHsva({
      h: cells[0],
      s: cells[1],
      v: cells[2],
      a: cells[3],
    });
  }

  private parseHslString(input: string): HSVA {
    const cells = splitColorStr(input, parseHueUnit);

    return hslToHsva({
      h: cells[0],
      s: cells[1],
      l: cells[2],
      a: cells[3],
    });
  }

  private parseRgbString(input: string): HSVA {
    const cells = splitColorStr(input, (num, txt) =>
      txt.includes("%") ? round((num / 100) * 255) : num,
    );

    return rgbToHsva({
      r: cells[0],
      g: cells[1],
      b: cells[2],
      a: cells[3],
    });
  }

  private toHexString(): string {
    const { r, g, b, a } = this.toRgb();
    let hex = "#";
    const rHex = r.toString(16);
    hex += rHex.length === 2 ? rHex : "0" + rHex;
    const gHex = g.toString(16);
    hex += gHex.length === 2 ? gHex : "0" + gHex;
    const bHex = b.toString(16);
    hex += bHex.length === 2 ? bHex : "0" + bHex;
    if (a! >= 0 && a! < 1) {
      const aHex = round(a! * 255).toString(16);
      hex += aHex.length === 2 ? aHex : "0" + aHex;
    }
    return hex;
  }

  private toHslString(): string {
    const { h, s, l, a } = this.toHsl();
    const hue = round(h);
    const saturation = round(s * 100);
    const lightness = round(l * 100);

    return a && a !== 1
      ? `hsla(${hue},${saturation}%,${lightness}%,${formatAlpha(a)})`
      : `hsl(${hue},${saturation}%,${lightness}%)`;
  }

  private toHsvString(): string {
    const { h, s, v, a } = this.hsva;
    const hue = round(h);
    const saturation = round(s * 100);
    const value = round(v * 100);

    return a !== 1
      ? `hsva(${hue},${saturation}%,${value}%,${formatAlpha(a)})`
      : `hsv(${hue},${saturation}%,${value}%)`;
  }

  private toRgbString(): string {
    const { r, g, b, a } = this.toRgb();
    return a !== 1
      ? `rgba(${r},${g},${b},${formatAlpha(a!)})`
      : `rgb(${r},${g},${b})`;
  }
}
