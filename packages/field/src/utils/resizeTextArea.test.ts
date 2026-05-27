import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import resizeTextArea from "./resizeTextArea";
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

    expect(resizeTextArea(textarea)).toBe(true);
    expect(textarea.style.height).toBe("30px");
    expect(textarea.style.minHeight).toBe("");
    expect(textarea.style.maxHeight).toBe("");
    expect(textarea.style.overflowY).toBe("");
    expect(resizeTextArea(textarea)).toBe(false);
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

    expect(resizeTextArea(textarea)).toBe(true);
    expect(textarea.style.height).toBe("24px");
    expect(textarea.style.overflowY).toBe("");
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

    expect(resizeTextArea(textarea, 2, 3)).toBe(true);
    expect(textarea.style.height).toBe("49px");
    expect(textarea.style.minHeight).toBe("37px");
    expect(textarea.style.maxHeight).toBe("49px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("keeps overflowY as auto for maxRows even when content does not overflow", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "one";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "content-box",
      "line-height": "12px",
    });

    expect(resizeTextArea(textarea, undefined, 3)).toBe(true);
    expect(textarea.style.height).toBe("12px");
    expect(textarea.style.maxHeight).toBe("36px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("enforces minRows even when content is shorter than the minimum", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "one";
    document.body.appendChild(textarea);
    setMockStyle(textarea, {
      "box-sizing": "content-box",
      "line-height": "14px",
    });

    expect(resizeTextArea(textarea, 3)).toBe(true);
    expect(textarea.style.height).toBe("42px");
    expect(textarea.style.minHeight).toBe("42px");
    expect(textarea.style.maxHeight).toBe("");
    expect(textarea.style.overflowY).toBe("");
  });

  it("reuses the hidden textarea and keeps wrap in sync", () => {
    const first = document.createElement("textarea");
    first.value = "one";
    first.setAttribute("wrap", "off");
    document.body.appendChild(first);
    setMockStyle(first);

    resizeTextArea(first);

    const hiddenTextarea = document.querySelector(
      'textarea[name="hiddenTextarea"]',
    ) as HTMLTextAreaElement | null;
    expect(hiddenTextarea).not.toBeNull();
    expect(hiddenTextarea?.getAttribute("wrap")).toBe("off");

    const second = document.createElement("textarea");
    second.value = "two";
    document.body.appendChild(second);
    setMockStyle(second);

    resizeTextArea(second);

    expect(
      document.querySelectorAll('textarea[name="hiddenTextarea"]'),
    ).toHaveLength(1);
    expect(hiddenTextarea?.hasAttribute("wrap")).toBe(false);
  });
});
