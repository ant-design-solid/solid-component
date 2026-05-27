import { PolymorphicProps } from "@solid-component/polymorphic";
import { createResizeObserver } from "@solid-primitive/web";
import { createEffect, createMemo, JSX, onCleanup, splitProps } from "solid-js";
import { useFieldContext } from "./FieldContext";
import { FieldBaseInput, FieldBaseInputOwnProps } from "./FieldInput";
import measureTextAreaHeight from "./utils/measureTextAreaHeight";

interface AutoSizeConfig {
  minRows?: number;
  maxRows?: number;
}

export interface FieldTextAreaInputOwnProps extends FieldBaseInputOwnProps {
  autoSize?: boolean | AutoSizeConfig;
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
  let ignoredObserverCycles = 0;

  const notifyResize = (el: HTMLTextAreaElement) => {
    if (!local.onResize) return;
    const rect = el.getBoundingClientRect();
    local.onResize(rect);
  };

  const resizeNow = (el: HTMLTextAreaElement) => {
    const config = autoSizeConfig();
    if (!config) return false;

    const { minRows, maxRows } = config;
    const measurement = measureTextAreaHeight(el, minRows, maxRows);
    let changed = false;

    const nextHeight = `${measurement.height}px`;
    if (el.style.height !== nextHeight) {
      el.style.height = nextHeight;
      changed = true;
    }

    if (measurement.minHeight != null) {
      const nextMinHeight = `${measurement.minHeight}px`;
      if (el.style.minHeight !== nextMinHeight) {
        el.style.minHeight = nextMinHeight;
        changed = true;
      }
    } else if (el.style.minHeight) {
      el.style.minHeight = "";
      changed = true;
    }

    if (measurement.maxHeight != null) {
      const nextMaxHeight = `${measurement.maxHeight}px`;
      if (el.style.maxHeight !== nextMaxHeight) {
        el.style.maxHeight = nextMaxHeight;
        changed = true;
      }
    } else if (el.style.maxHeight) {
      el.style.maxHeight = "";
      changed = true;
    }

    if (measurement.overflowY != null) {
      if (el.style.overflowY !== measurement.overflowY) {
        el.style.overflowY = measurement.overflowY;
        changed = true;
      }
    } else if (el.style.overflowY) {
      el.style.overflowY = "";
      changed = true;
    }

    if (changed) {
      ignoredObserverCycles += 1;
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
      ignoredObserverCycles = 0;

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
      if (ignoredObserverCycles > 0) {
        ignoredObserverCycles -= 1;
        return;
      }

      scheduleResize(el);
      return;
    }

    notifyResize(el);
  });

  return <FieldBaseInput as="textarea" style={local.style} {...rest} />;
}

function makeRaf() {
  let frameId: number | undefined;

  const cancel = () => {
    if (frameId != null) {
      cancelAnimationFrame(frameId);
    }
  };
  const raf = (callback: VoidFunction) => {
    cancel();
    frameId = requestAnimationFrame(() => {
      frameId = undefined;
      callback();
    });
  };
  onCleanup(cancel);

  return [raf, cancel] as const;
}
