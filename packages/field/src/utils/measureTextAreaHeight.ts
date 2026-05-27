const HIDDEN_TEXTAREA_STYLE = `
  min-height:0 !important;
  max-height:none !important;
  height:0 !important;
  visibility:hidden !important;
  overflow:hidden !important;
  position:absolute !important;
  z-index:-1000 !important;
  top:0 !important;
  left:0 !important;
  pointer-events:none !important;
`;

const SIZING_STYLE = [
  "box-sizing",
  "width",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "border-top-width",
  "border-bottom-width",
  "font-family",
  "font-weight",
  "font-size",
  "font-variant",
  "line-height",
  "letter-spacing",
  "text-indent",
  "text-transform",
  "text-rendering",
  "white-space",
  "word-break",
  "word-spacing",
  "tab-size",
] as const;

export interface TextAreaMeasurement {
  height: number;
  minHeight?: number;
  maxHeight?: number;
  overflowY?: "hidden" | "auto";
}

interface TextAreaSizingData {
  boxSizing: string;
  paddingSize: number;
  borderSize: number;
  sizingStyle: string;
}

const hiddenTextareaMap = new WeakMap<Document, HTMLTextAreaElement>();

function parseSizeValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getHiddenTextarea(el: HTMLTextAreaElement) {
  const doc = el.ownerDocument;
  let hiddenTextarea = hiddenTextareaMap.get(doc);
  if (!hiddenTextarea) {
    hiddenTextarea = doc.createElement("textarea");
    hiddenTextarea.setAttribute("tab-index", "-1");
    hiddenTextarea.setAttribute("aria-hidden", "true");
    hiddenTextarea.setAttribute("name", "hiddenTextarea");
    hiddenTextareaMap.set(doc, hiddenTextarea);
  }

  if (!hiddenTextarea.isConnected) {
    (doc.body ?? doc.documentElement).appendChild(hiddenTextarea);
  }

  return hiddenTextarea;
}

function getTextAreaSizingData(el: HTMLTextAreaElement): TextAreaSizingData {
  const style = getComputedStyle(el);

  return {
    boxSizing: style.getPropertyValue("box-sizing"),
    paddingSize:
      parseSizeValue(style.getPropertyValue("padding-top")) +
      parseSizeValue(style.getPropertyValue("padding-bottom")),
    borderSize:
      parseSizeValue(style.getPropertyValue("border-top-width")) +
      parseSizeValue(style.getPropertyValue("border-bottom-width")),
    sizingStyle: SIZING_STYLE.map(
      (name) => `${name}:${style.getPropertyValue(name)}`,
    ).join(";"),
  };
}

export default function measureTextAreaHeight(
  el: HTMLTextAreaElement,
  minRows?: number,
  maxRows?: number,
): TextAreaMeasurement {
  const hiddenTextarea = getHiddenTextarea(el);
  const { boxSizing, paddingSize, borderSize, sizingStyle } =
    getTextAreaSizingData(el);

  const wrap = el.getAttribute("wrap");
  if (wrap) {
    hiddenTextarea.setAttribute("wrap", wrap);
  } else {
    hiddenTextarea.removeAttribute("wrap");
  }

  hiddenTextarea.setAttribute(
    "style",
    `${sizingStyle};${HIDDEN_TEXTAREA_STYLE}`,
  );
  hiddenTextarea.value = el.value || el.placeholder || "";

  let height = hiddenTextarea.scrollHeight;
  if (boxSizing === "border-box") {
    height += borderSize;
  } else if (boxSizing === "content-box") {
    height = Math.max(height - paddingSize, 0);
  }
  const naturalHeight = height;

  let minHeight: number | undefined;
  let maxHeight: number | undefined;

  if (minRows != null || maxRows != null) {
    hiddenTextarea.value = " ";
    const singleRowHeight = hiddenTextarea.scrollHeight - paddingSize;

    if (minRows != null) {
      minHeight = singleRowHeight * minRows;
      if (boxSizing === "border-box") {
        minHeight += paddingSize + borderSize;
      }
      height = Math.max(minHeight, height);
    }

    if (maxRows != null) {
      maxHeight = singleRowHeight * maxRows;
      if (boxSizing === "border-box") {
        maxHeight += paddingSize + borderSize;
      }
      height = Math.min(maxHeight, height);
    }
  }

  return {
    height,
    minHeight,
    maxHeight,
    overflowY:
      maxHeight != null
        ? naturalHeight > maxHeight
          ? "auto"
          : "hidden"
        : undefined,
  };
}
