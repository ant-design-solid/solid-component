import { PolymorphicProps } from "@solid-component/polymorphic";
import { makeRaf } from "@solid-component/utils";
import { createResizeObserver } from "@solid-primitive/web";
import { createEffect, createMemo, JSX, splitProps } from "solid-js";
import { useFieldContext } from "./FieldContext";
import { FieldBaseInput, FieldBaseInputOwnProps } from "./FieldInput";
import resizeTextArea from "./utils/resizeTextArea";

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

export default function FieldTextArea(
  props: PolymorphicProps<"textarea", FieldTextAreaProps>,
) {
  const { fieldRef, value } = useFieldContext();
  const textareaRef = () => {
    const el = fieldRef();
    return el instanceof HTMLTextAreaElement ? el : null;
  };
  const [local, rest] = splitProps(props as FieldTextAreaProps, [
    "autoSize",
    "onResize",
    "style",
  ]);

  const autoSizeConfig = createMemo(() => {
    const config = local.autoSize;
    if (config) {
      if (typeof config === "object") {
        return config;
      }
      return {};
    }
  });

  const [raf, cancelRaf] = makeRaf();
  let hasPendingSelfResize = false;
  let lastObservedWidth: number | undefined;

  const notifyResize = (el: HTMLTextAreaElement) => {
    if (!local.onResize) return;
    const rect = el.getBoundingClientRect();
    local.onResize(rect);
  };

  const resizeNow = (el: HTMLTextAreaElement) => {
    const config = autoSizeConfig();
    if (!config) return false;

    const { minRows, maxRows } = config;
    const changed = resizeTextArea(el, minRows, maxRows);

    if (changed) {
      hasPendingSelfResize = true;
    }

    return changed;
  };

  const scheduleResize = (el: HTMLTextAreaElement) => {
    raf(() => {
      if (!el.isConnected) return;

      const changed = resizeNow(el);
      if (changed) {
        notifyResize(el);
      }
    });
  };

  createEffect(() => {
    if (!local.autoSize) {
      cancelRaf();
      hasPendingSelfResize = false;
      lastObservedWidth = undefined;

      const el = textareaRef();
      if (el) {
        el.style.height = "";
        el.style.minHeight = "";
        el.style.maxHeight = "";
        el.style.overflowY = "";
      }
      return;
    }

    value();
    autoSizeConfig();

    const el = textareaRef();
    if (!el) return;
    lastObservedWidth = el.clientWidth;
    const changed = resizeNow(el);
    if (changed) {
      notifyResize(el);
    }
  });

  const target = createMemo(
    () => (!!local.autoSize || local.onResize) && textareaRef(),
  );
  createResizeObserver(target, () => {
    const el = target();
    if (!el) return;

    if (local.autoSize) {
      const width = el.clientWidth;
      if (width !== lastObservedWidth) {
        lastObservedWidth = width;
        scheduleResize(el);
        return;
      }

      if (hasPendingSelfResize) {
        hasPendingSelfResize = false;
        return;
      }

      scheduleResize(el);
      return;
    }

    notifyResize(el);
  });

  return <FieldBaseInput as="textarea" style={local.style} {...rest} />;
}
