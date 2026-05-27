import Polymorphic, { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import { callHandler, mergeRefs, mergeStyle } from "@solid-component/utils";
import { createEffect, createMemo, JSX, mergeProps, splitProps, ValidComponent } from "solid-js";
import { useSliderContext, useSliderThumbContext } from "./SliderContext";
import { getThumbStyle } from "./utils/direction";

interface SliderThumbCommonProps<T extends HTMLElement = HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref" | "style" | "tabIndex" | "onPointerDown" | "onKeyDown" | "onFocus" | "onBlur"
> {}

export interface SliderThumbOwnProps {
  disabled?: boolean;
}

interface SliderThumbElementProps extends SliderThumbCommonProps {
  role: "slider";
  tabIndex: number | undefined | string;
}

export interface SliderThumbProps<T extends ValidComponent | HTMLElement = HTMLElement>
  extends SliderThumbOwnProps, SliderThumbCommonProps<ElementOf<T>> {}

const defaults = {
  as: "div",
} as const;

export default function SliderThumb<T extends ValidComponent>(
  props: PolymorphicProps<T, SliderThumbProps<T>>,
) {
  const context = useSliderContext();
  const thumbContext = useSliderThumbContext();
  const merged = mergeProps(defaults, props as SliderThumbProps);
  const [local, rest] = splitProps(merged, [
    "as",
    "ref",
    "disabled",
    "style",
    "tabIndex",
    "onPointerDown",
    "onKeyDown",
    "onFocus",
    "onBlur",
  ]);

  const thumb = createMemo(() => thumbContext ?? context.thumbs()[0]);
  const disabled = createMemo(() => local.disabled || context.disabled());
  let thumbRef: HTMLElement | undefined;

  createEffect(() => {
    const activeThumb = context.activeThumb();
    if (disabled() || !thumbRef) return;
    if (activeThumb === thumb().id && document.activeElement !== thumbRef) {
      thumbRef.focus();
    }
  });

  const style = createMemo(() =>
    mergeStyle(getThumbStyle(thumb().percent() ?? 0, context.direction()), local.style),
  );

  const onKeyDown: SliderThumbProps["onKeyDown"] = (event) => {
    if (!context.disabled() && context.keyboard()) {
      const step = context.step();
      const currentThumb = thumb();
      const current = currentThumb.value();
      const id = currentThumb.id;
      const direction = context.direction();

      const update = (value: number) => {
        event.preventDefault();
        if (!id) return;
        context.setActiveThumb(id);
        context.setThumbValue(id, value);
      };

      switch (event.key) {
        case "ArrowLeft":
          update(current + step * (direction === "rtl" ? 1 : -1));
          break;
        case "ArrowRight":
          update(current + step * (direction === "rtl" ? -1 : 1));
          break;
        case "ArrowUp":
          update(current + step * (direction === "ttb" ? -1 : 1));
          break;
        case "ArrowDown":
          update(current + step * (direction === "ttb" ? 1 : -1));
          break;
        case "Home":
          update(currentThumb.min());
          break;
        case "End":
          update(currentThumb.max());
          break;
      }
    }

    callHandler(event, local.onKeyDown);
  };

  const onPointerDown: SliderThumbProps["onPointerDown"] = (event) => {
    const id = thumb().id;
    if (id) {
      context.setActiveThumb(id);
      context.beginSlide(event, id);
    }
    callHandler(event, local.onPointerDown);
  };

  const onFocus: SliderThumbCommonProps["onFocus"] = (event) => {
    const id = thumb().id;
    if (id) {
      context.setActiveThumb(id);
    }
    callHandler(event, local.onFocus);
  };

  const onBlur: SliderThumbCommonProps["onBlur"] = (event) => {
    if (context.activeThumb() === thumb().id) {
      context.setActiveThumb(undefined);
    }
    callHandler(event, local.onBlur);
  };

  return (
    <Polymorphic<SliderThumbElementProps>
      as={local.as}
      ref={mergeRefs((el) => (thumbRef = el), local.ref)}
      role="slider"
      tabIndex={context.disabled() ? undefined : (local.tabIndex ?? 0)}
      aria-orientation={
        context.direction() === "ltr" || context.direction() === "rtl" ? "horizontal" : "vertical"
      }
      aria-valuemin={thumb().min()}
      aria-valuemax={thumb().max()}
      aria-valuenow={thumb().value()}
      aria-disabled={disabled() || undefined}
      style={style()}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onFocus={onFocus}
      onBlur={onBlur}
      {...rest}
    />
  );
}
