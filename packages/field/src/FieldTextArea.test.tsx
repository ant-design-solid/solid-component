import { createSignal, JSX } from "solid-js";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import {
  measureElement,
  notifyResize,
  setElementSize,
} from "../../.test/resize-observer";
import FieldRoot from "./FieldRoot";
import FieldTextArea from "./FieldTextArea";

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
      const width = Math.max(parseStyleNumber(styleText, "width"), 1);
      const lineHeight = parseStyleNumber(styleText, "line-height");
      const paddingTop = parseStyleNumber(styleText, "padding-top");
      const paddingBottom = parseStyleNumber(styleText, "padding-bottom");
      const text: string = this.value || this.placeholder || "";
      const charsPerLine = Math.max(Math.floor(width / 10), 1);
      const lines = Math.max(
        text
          .split("\n")
          .reduce(
            (total, line) =>
              total + Math.max(Math.ceil(line.length / charsPerLine), 1),
            0,
          ),
        1,
      );

      return lineHeight * lines + paddingTop + paddingBottom;
    },
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  styleMap = new WeakMap<HTMLElement, JSX.CSSProperties>();
  vi.clearAllMocks();
});

describe("FieldTextArea", () => {
  it("resizes synchronously when the textarea value changes", async () => {
    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    setMockStyle(textarea);

    await Promise.resolve();
    expect(textarea.style.height).toBe("10px");

    textarea.value = "first\nsecond";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    expect(textarea.style.height).toBe("20px");

    dispose();
  });

  it("applies placeholder-driven height on initial mount", async () => {
    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize placeholder={"first line\nsecond line"} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    setMockStyle(textarea);

    await Promise.resolve();

    expect(textarea.style.height).toBe("20px");

    dispose();
  });

  it("ignores the resize observer cycle triggered by its own autosize update", async () => {
    const onResize = vi.fn();

    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize onResize={onResize} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    setMockStyle(textarea);

    await Promise.resolve();

    expect(textarea.style.height).toBe("10px");

    // Simulate the first ResizeObserver callback firing after mount
    notifyResize(textarea);
    expect(onResize).toHaveBeenCalledTimes(1);

    await nextFrame();

    // Cycle is broken: re-measure updates height but doesn't call onResize again
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(textarea.style.height).toBe("10px");

    dispose();
  });

  it("cancels a queued observer resize when autosize is turned off", async () => {
    const [autoSize, setAutoSize] = createSignal(true);
    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize={autoSize()} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    setMockStyle(textarea);

    await Promise.resolve();

    notifyResize(textarea);
    notifyResize(textarea);
    setAutoSize(false);

    await nextFrame();

    expect(textarea.style.height).toBe("");
    expect(textarea.style.minHeight).toBe("");
    expect(textarea.style.maxHeight).toBe("");
    expect(textarea.style.overflowY).toBe("");

    dispose();
  });

  it("clears overflowY when autosize stops using maxRows", async () => {
    const [autoSize, setAutoSize] = createSignal<
      boolean | { minRows?: number; maxRows?: number }
    >({ maxRows: 1 });

    const { host, dispose } = mount(() => (
      <FieldRoot value={"first\nsecond"}>
        <FieldTextArea autoSize={autoSize()} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    setMockStyle(textarea);

    await Promise.resolve();
    expect(textarea.style.overflowY).toBe("hidden");

    setAutoSize(true);
    await Promise.resolve();

    expect(textarea.style.overflowY).toBe("");

    dispose();
  });

  it("remeasures when the textarea width changes", async () => {
    const value = "12345678901234567890";
    const { host, dispose } = mount(() => (
      <FieldRoot value={value}>
        <FieldTextArea autoSize />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    setMockStyle(textarea, { width: "240px" });
    setElementSize(textarea, 240);

    await Promise.resolve();
    expect(textarea.style.height).toBe("10px");

    setMockStyle(textarea, { width: "80px" });
    await measureElement(textarea, 80);

    expect(textarea.style.height).toBe("30px");

    dispose();
  });
});
