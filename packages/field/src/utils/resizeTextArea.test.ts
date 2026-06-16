import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { measureTextAreaHeight } from "./resizeTextArea";
import { JSX } from "solid-js";

const DEFAULT_STYLE: JSX.CSSProperties = {
  "box-sizing": "content-box",
  width: "240px",
  "padding-top": "0px",
  "padding-bottom": "0px",
  "padding-left": "0px",
  "padding-right": "0px",
  "border-top-width": "0px",
  "border-bottom-width": "0px",
  "font-family": "sans-serif",
  "font-weight": "400",
  "font-size": "16px",
  "font-variant": "normal",
  "line-height": "10px",
  "letter-spacing": "0px",
  "text-indent": "0px",
  "text-transform": "none",
  "text-rendering": "auto",
  "white-space": "pre-wrap",
  "word-break": "break-word",
  "word-spacing": "0px",
  "tab-size": "4",
};

let styleMap = new WeakMap<HTMLElement, JSX.CSSProperties>();

function parseStyleNumber(styleText: string, property: string) {
  const match = styleText.match(new RegExp(`${property}:([^;]+)`));
  return match ? Number.parseFloat(match[1]) || 0 : 0;
}

function setMockStyle(el: HTMLElement, style: Partial<JSX.CSSProperties> = {}) {
  styleMap.set(el, {
    ...DEFAULT_STYLE,
    ...style,
  });
}

beforeAll(() => {
  vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
    const style = styleMap.get(el as HTMLElement) ?? (DEFAULT_STYLE as any);
    return {
      getPropertyValue: (property: string) => style[property] ?? "",
    } as CSSStyleDeclaration;
  });

  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      const styleText = this.getAttribute("style") ?? "";
      const lineHeight = parseStyleNumber(styleText, "line-height");
      const paddingTop = parseStyleNumber(styleText, "padding-top");
      const paddingBottom = parseStyleNumber(styleText, "padding-bottom");
      const lines = Math.max(this.value.split("\n").length, 1);

      return lineHeight * lines + paddingTop + paddingBottom;
    },
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  styleMap = new WeakMap<HTMLElement, JSX.CSSProperties>();
  vi.clearAllMocks();
});

describe("resizeTextArea", () => {
  it("applies natural height for content-box textareas", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "first\nsecond\nthird";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "content-box",
      "padding-top": "2px",
      "padding-bottom": "3px",
      "line-height": "10px",
    });

    const r1 = measureTextAreaHeight(textarea);
    expect(r1.height).toBe(30);
    expect(r1.minHeight).toBeUndefined();
    expect(r1.maxHeight).toBeUndefined();

    const r2 = measureTextAreaHeight(textarea);
    expect(r2.height).toBe(30);
  });

  it("uses placeholder text when the textarea value is empty", () => {
    const textarea = document.createElement("textarea");
    textarea.placeholder = "alpha\nbeta";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "content-box",
      "padding-top": "1px",
      "padding-bottom": "1px",
      "line-height": "12px",
    });

    const r = measureTextAreaHeight(textarea);
    expect(r.height).toBe(24);
    expect(r.maxHeight).toBeUndefined();
  });

  it("clamps border-box height with minRows and maxRows", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "one\ntwo\nthree\nfour";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "border-box",
      "padding-top": "4px",
      "padding-bottom": "6px",
      "border-top-width": "1px",
      "border-bottom-width": "2px",
      "line-height": "12px",
    });

    const r = measureTextAreaHeight(textarea, 2, 3);
    expect(r.height).toBe(49);
    expect(r.minHeight).toBe(37);
    expect(r.maxHeight).toBe(49);
  });

  it("keeps overflowY as auto for maxRows even when content does not overflow", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "one";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "content-box",
      "line-height": "12px",
    });

    const r = measureTextAreaHeight(textarea, undefined, 3);
    expect(r.height).toBe(12);
    expect(r.maxHeight).toBe(36);
  });

  it("enforces minRows even when content is shorter than the minimum", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "one";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "content-box",
      "line-height": "14px",
    });

    const r = measureTextAreaHeight(textarea, 3);
    expect(r.height).toBe(42);
    expect(r.minHeight).toBe(42);
    expect(r.maxHeight).toBeUndefined();
  });

  it("reuses the hidden textarea and keeps wrap in sync", () => {
    const first = document.createElement("textarea");
    first.value = "one";
    first.setAttribute("wrap", "off");
    document.body.appendChild(first);
    setMockStyle(first);

    measureTextAreaHeight(first);

    const hiddenTextarea = document.querySelector(
      'textarea[name="hiddenTextarea"]',
    ) as HTMLTextAreaElement | null;
    expect(hiddenTextarea).not.toBeNull();
    expect(hiddenTextarea?.getAttribute("wrap")).toBe("off");

    const second = document.createElement("textarea");
    second.value = "two";
    document.body.appendChild(second);
    setMockStyle(second);

    measureTextAreaHeight(second);

    expect(
      document.querySelectorAll('textarea[name="hiddenTextarea"]'),
    ).toHaveLength(1);
    expect(hiddenTextarea?.hasAttribute("wrap")).toBe(false);
  });
});
