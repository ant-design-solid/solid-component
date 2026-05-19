import { describe, expect, it } from "vitest";
import { Color } from "./Color";

describe("Color", () => {
  it("updates hsv channels immutably", () => {
    const color = new Color("#1677ff");
    const next = color.withHsv({ h: 120 });

    expect(next).not.toBe(color);
    expect(color.toHsv().h).toBe(215);
    expect(next.toHsv().h).toBe(120);
  });

  it("clamps channel updates", () => {
    const color = new Color("#1677ff");
    const next = color.withHsv({ s: 2, v: -1, a: 3 });

    expect(next.toHsv().s).toBe(1);
    expect(next.toHsv().v).toBe(0);
    expect(next.toHsv().a).toBe(1);
  });

  it("formats into supported string outputs", () => {
    const color = new Color("#1677ff");

    expect(color.format("hex")).toBe("#1677ff");
    expect(color.format("rgb")).toBe("rgb(22,119,255)");
    expect(color.format("hsl")).toMatch(/^hsl/);
    expect(color.format("hsv")).toMatch(/^hsv/);
  });

  it("preserves hue when value becomes grayscale", () => {
    const color = new Color("#1677ff");
    const next = color.withHsv({ s: 0, v: 0.5 });

    expect(next.toHsv()).toEqual({
      h: 215,
      s: 0,
      v: 0.5,
      a: 1,
    });
    expect(next.format("rgb")).toBe("rgb(128,128,128)");
  });
});
