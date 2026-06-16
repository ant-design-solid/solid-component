import { PolymorphicProps } from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import { createResizeObserver } from "@solid-primitive/resize-observer";
import { makeRaf } from "@solid-primitive/scheduler";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  onCleanup,
  splitProps,
  untrack,
} from "solid-js";
import { useFieldContext } from "./FieldContext";
import { FieldBaseInput, FieldBaseInputOwnProps } from "./FieldInput";
import {
  measureTextAreaHeight,
  TextAreaMeasurement,
} from "./utils/resizeTextArea";

interface AutoSizeConfig {
  /** Minimum visible rows when autoSize is enabled. */
  minRows?: number;
  /** Maximum visible rows when autoSize is enabled. */
  maxRows?: number;
}

export interface FieldTextAreaInputOwnProps extends FieldBaseInputOwnProps {
  /**
   * Automatically adjusts the textarea height to fit its content.
   *
   * - `true` enables content-based sizing with no row clamp.
   * - `{ minRows, maxRows }` enables autosize with row constraints.
   *
   * When enabled, the component controls the textarea's inline
   * `height`, `minHeight`, `maxHeight`, and `overflowY` styles.
   */
  autoSize?: boolean | AutoSizeConfig;
  /**
   * Called after the textarea size changes.
   *
   * The callback is triggered after autosize updates and after
   * external element resize observations that change the rendered size.
   */
  onResize?: (size: Record<"width" | "height", number>) => void;
}

interface FieldTextAreaCommonProps extends Pick<
  JSX.HTMLAttributes<HTMLTextAreaElement>,
  "style"
> {}

export interface FieldTextAreaProps
  extends FieldTextAreaInputOwnProps, FieldTextAreaCommonProps {}

const RESIZE_START = 0;
const RESIZE_MEASURING = 1;
const RESIZE_STABLE = 2;

type ResizeState =
  | typeof RESIZE_START
  | typeof RESIZE_MEASURING
  | typeof RESIZE_STABLE;

export default function FieldTextArea(
  props: PolymorphicProps<"textarea", FieldTextAreaProps>,
) {
  const { fieldRef, value } = useFieldContext();
  const [local, rest] = splitProps(props as FieldTextAreaProps, [
    "autoSize",
    "onResize",
    "style",
  ]);
  const [resizeState, setResizeState] =
    createSignal<ResizeState>(RESIZE_STABLE);
  const [measurement, setMeasurement] = createSignal<TextAreaMeasurement>();

  const textareaRef = createMemo(() => {
    const el = fieldRef();
    return el instanceof HTMLTextAreaElement ? el : null;
  });

  const autoSizeConfig = createMemo(() => {
    const config = local.autoSize;
    if (config) {
      if (typeof config === "object") {
        return config;
      }
      return {};
    }
  });

  const style = createMemo(() => {
    const autoSizeStyle: JSX.CSSProperties = {};

    const measure = measurement();

    if (measure) {
      autoSizeStyle.height = measure.height + "px";
      const maxHeight = measure.maxHeight;
      autoSizeStyle["max-height"] =
        maxHeight != null ? measure.maxHeight + "px" : undefined;
      autoSizeStyle["min-height"] =
        measure.minHeight != null ? measure.minHeight + "px" : undefined;
      autoSizeStyle["overflow-y"] =
        maxHeight != null
          ? measure.height > maxHeight
            ? "auto"
            : "hidden"
          : undefined;
      autoSizeStyle["resize"] = "none";
    }

    if (resizeState() !== RESIZE_STABLE) {
      autoSizeStyle["overflow-x"] = "hidden";
      autoSizeStyle["overflow-y"] = "hidden";
    }

    return mergeStyle(autoSizeStyle, local.style);
  });

  const [raf, cancelRaf] = makeRaf();
  createEffect(() => {
    const config = autoSizeConfig();
    if (!config) {
      cancelRaf()
      batch(() => {
        setMeasurement(undefined);
        setResizeState(RESIZE_STABLE);
      });
      return;
    }

    value();
    setResizeState(RESIZE_START);
  });

  createEffect(() => {
    const el = textareaRef();
    if (!el) return;
    const state = resizeState();

    untrack(() => {
      if (state === RESIZE_START) {
        setResizeState(RESIZE_MEASURING);
      } else if (state === RESIZE_MEASURING) {
        const config = autoSizeConfig();
        if (!config) return;

        const { minRows, maxRows } = config;
        const next = measureTextAreaHeight(el, minRows, maxRows);
        const prev = measurement();
        const changed =
          !prev ||
          prev.height !== next.height ||
          prev.minHeight !== next.minHeight ||
          prev.maxHeight !== next.maxHeight;

        batch(() => {
          changed && setMeasurement(next);
          setResizeState(RESIZE_STABLE);
        });
      }
    });
  });

  onCleanup(cancelRaf);

  createResizeObserver(
    () => (!!local.autoSize || local.onResize) && textareaRef(),
    ([entry]) => {
      if (resizeState() !== RESIZE_STABLE) return;

      if (local.onResize) {
        const rect = entry.target.getBoundingClientRect();
        local.onResize(rect);
      }

      if (local.autoSize) {
        raf(() => {
          setResizeState(RESIZE_START);
        });
      }
    },
  );

  return <FieldBaseInput as="textarea" style={style()} {...rest} />;
}
