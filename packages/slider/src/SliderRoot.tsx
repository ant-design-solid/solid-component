import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { composeHandlers, mergeStyle } from "@solid-component/utils";
import {
  batch,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  JSX,
  mergeProps,
  on,
  splitProps,
  untrack,
  ValidComponent,
} from "solid-js";
import {
  SliderContext,
  SliderContextValue,
  SliderThumbState,
  SliderValue,
} from "./SliderContext";
import { getPointerPercent } from "./utils/direction";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundValue(value: number, step: number | null, min: number) {
  if (step == null || step <= 0) {
    return value;
  }

  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

function normalizeValues(
  source: SliderValue,
  min: number,
  max: number,
  step: number | null,
) {
  const values = Array.isArray(source) ? source : [source];

  return values
    .map((item) => clamp(roundValue(item, step, min), min, max))
    .sort((a, b) => a - b);
}

function valuesEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function getDecimalPlaces(value: number) {
  const normalized = `${value}`.toLowerCase();
  if (normalized.includes("e-")) {
    const [, exponent = "0"] = normalized.split("e-");
    const [, fraction = ""] = normalized.split(".");
    return Number(exponent) + fraction.length;
  }

  return normalized.split(".")[1]?.length ?? 0;
}

function withPrecision(value: number, step: number, min: number, max: number) {
  const precision = Math.max(
    getDecimalPlaces(min),
    getDecimalPlaces(max),
    getDecimalPlaces(step),
  );

  return Number(value.toFixed(precision));
}

interface ThumbModel extends SliderThumbState {
  id: string;
  order: number;
  setValue: (value: number) => number;
}

function compareThumbs(a: ThumbModel, b: ThumbModel) {
  return a.value() - b.value() || a.order - b.order;
}

interface SliderRootCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<
  JSX.HTMLAttributes<T>,
  | "ref"
  | "style"
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
> {}

interface ExposeContext {
  focus: VoidFunction;
  blur: VoidFunction;
}

export interface SliderRootOwnProps<TValue extends SliderValue = number> {
  value?: TValue;
  defaultValue?: TValue;
  disabled?: boolean;
  keyboard?: boolean;
  min?: number;
  max?: number;
  step?: number /**| null*/;
  allowCross?: boolean;
  // range?: boolean;
  reverse?: boolean;
  vertical?: boolean;
  onChange?: (value: TValue) => void;
  onChangeEnd?: (value: TValue) => void;

  expose?: (context: ExposeContext) => void;
}

export interface SliderRootElementProps<
  T extends HTMLElement,
> extends SliderRootCommonProps<T> {
  role: "group";
}

export interface SliderRootProps<
  T extends ValidComponent,
  TValue extends SliderValue = number,
>
  extends SliderRootOwnProps<TValue>, SliderRootCommonProps<ElementOf<T>> {}

const defaults = {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  keyboard: true,
  allowCross: true,
} as const;

export default function SliderRoot<
  T extends ValidComponent,
  TValue extends SliderValue = number,
>(props: PolymorphicProps<T, SliderRootProps<T, TValue>>) {
  const merged = mergeProps(defaults, props as SliderRootProps<"div", TValue>);
  const [local, rest] = splitProps(merged, [
    "ref",
    "style",
    "value",
    "defaultValue",
    "disabled",
    "min",
    "max",
    "step",
    "keyboard",
    "allowCross",
    // "range",
    "reverse",
    "vertical",
    "onChange",
    "onChangeEnd",
    "expose",

    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
  ]);

  const isMultiple = createMemo(
    () => Array.isArray(local.value) || Array.isArray(local.defaultValue),
  );
  const formatValue = (nextValues: number[]): TValue =>
    (isMultiple() ? nextValues : nextValues[0]) as TValue;

  let thumbSeed = 0;
  const createThumb = (value: number, order: number): ThumbModel => {
    const [currentValue, setCurrentValue] = createSignal(value);
    const id = `thumb-${thumbSeed++}`;

    const getOrderedIndex = () =>
      orderedThumbs().findIndex((thumb) => thumb.id === id);

    return {
      id,
      order,
      value: currentValue,
      percent: () => getValuePercent(currentValue()),
      min: () => {
        const index = getOrderedIndex();
        if (index <= 0 || local.allowCross) {
          return local.min;
        }
        return values()[index - 1]!;
      },
      max: () => {
        const index = getOrderedIndex();
        if (index < 0 || index >= values().length - 1 || local.allowCross) {
          return local.max;
        }
        return values()[index + 1]!;
      },
      setValue: setCurrentValue,
    };
  };

  const initialValues = normalizeValues(
    local.value ?? local.defaultValue ?? [local.min],
    local.min,
    local.max,
    local.step,
  );

  const [thumbs, setThumbs] = createSignal<ThumbModel[]>(
    initialValues.map((value, index) => createThumb(value, index)),
  );
  const [railRef, setRailRef] = createSignal<HTMLElement>();
  const [activeThumb, _setActiveThumb] = createSignal<string | undefined>();

  const orderedThumbs = createMemo(() => thumbs().slice().sort(compareThumbs));
  const values = createMemo(() =>
    orderedThumbs().map((thumb) => thumb.value()),
  );
  const thumbsById = createMemo(
    () => new Map(thumbs().map((thumb) => [thumb.id, thumb] as const)),
  );

  let interactionValues = values();
  let interactionDirty = false;
  let echoValues: number[] | null = null;

  const resetThumbs = (nextValues: number[]) => {
    setThumbs(nextValues.map((value, index) => createThumb(value, index)));
  };

  const reconcileValues = (nextValues: number[]) => {
    const current = thumbs();
    if (current.length !== nextValues.length) {
      resetThumbs(nextValues);
      return;
    }

    const ordered = current.slice().sort(compareThumbs);
    ordered.forEach((thumb, index) => {
      thumb.setValue(nextValues[index]!);
    });
  };

  createEffect(
    on(
      () => local.value,
      (nextValue) => {
        if (nextValue == null) {
          return;
        }

        const normalized = normalizeValues(
          nextValue,
          local.min,
          local.max,
          local.step,
        );

        if (echoValues && valuesEqual(echoValues, normalized)) {
          echoValues = null;
          return;
        }

        echoValues = null;

        if (!valuesEqual(untrack(values), normalized)) {
          reconcileValues(normalized);
        }
      },
    ),
  );

  const setActiveThumb = (id?: string) => {
    const prevId = activeThumb();
    if (prevId === id) {
      return;
    }

    if (prevId != null && interactionDirty) {
      interactionDirty = false;
      local.onChangeEnd?.(formatValue(interactionValues));
    }

    _setActiveThumb(id);
  };

  let activePointerId: number | null = null;
  let activePointerTarget: HTMLElement | null = null;
  let activeTrackRect: DOMRect | null = null;

  const direction = createMemo(() => {
    if (local.vertical) {
      return local.reverse ? "ttb" : "btt";
    }
    return local.reverse ? "rtl" : "ltr";
  });

  const getValuePercent = (value: number) =>
    ((value - local.min) / (local.max - local.min)) * 100;

  const constrainValue = (thumb: ThumbModel, nextValue: number) => {
    const min = thumb.min();
    const max = thumb.max();

    return withPrecision(
      clamp(roundValue(nextValue, local.step, local.min), min, max),
      local.step,
      local.min,
      local.max,
    );
  };

  const updateThumbValue = (id: string, nextValue: number): number[] | null => {
    const thumb = thumbsById().get(id);
    if (!thumb) {
      return null;
    }

    const constrained = constrainValue(thumb, nextValue);
    if (constrained === thumb.value()) {
      return null;
    }

    thumb.setValue(constrained);

    const nextValues = orderedThumbs().map((item) => item.value());
    interactionValues = nextValues;
    interactionDirty = true;
    echoValues = nextValues.slice();
    local.onChange?.(formatValue(nextValues));

    return nextValues;
  };

  const getPercentValue = (percent: number) => {
    const value = roundValue(
      local.min + percent * (local.max - local.min),
      local.step,
      local.min,
    );
    return clamp(value, local.min, local.max);
  };

  const resolveThumbId = (percent: number) => {
    const current = orderedThumbs();

    if (current.length <= 1) {
      return current[0]?.id;
    }

    const target = local.min + (local.max - local.min) * percent;
    let nearestId = current[0]?.id;
    let nearestDistance = Number.POSITIVE_INFINITY;

    current.forEach((thumb) => {
      const distance = Math.abs(thumb.value() - target);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = thumb.id;
      }
    });

    return nearestId;
  };

  local.expose?.({
    focus: () => {
      const firstId = orderedThumbs()[0].id;
      setActiveThumb(firstId);
    },
    blur: () => {
      setActiveThumb();
    },
  });

  const releasePointer = () => {
    if (
      activePointerId !== null &&
      activePointerTarget?.hasPointerCapture?.(activePointerId)
    ) {
      activePointerTarget.releasePointerCapture(activePointerId);
    }

    activePointerId = null;
    activePointerTarget = null;
    activeTrackRect = null;
  };

  const beginSlide: SliderContextValue["beginSlide"] = (event, id) => {
    if (local.disabled || event.button !== 0 || !event.isPrimary) {
      return;
    }

    if (activePointerId !== null) {
      return;
    }

    batch(() => {
      const rect = railRef()?.getBoundingClientRect() ?? null;

      if (id == null) {
        const percent = rect && getPointerPercent(event, rect, direction());
        if (percent == null) return;

        const resolvedId = resolveThumbId(percent);
        if (!resolvedId) return;

        setActiveThumb(resolvedId);
        updateThumbValue(resolvedId, getPercentValue(percent));
      } else {
        setActiveThumb(id);
      }

      activeTrackRect = rect;
      activePointerId = event.pointerId;
      activePointerTarget = event.currentTarget;

      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
  };

  const onPointerDown: SliderRootCommonProps["onPointerDown"] = (event) => {
    if (event.target === event.currentTarget && activePointerId === null) {
      beginSlide(event);
    }
  };

  const onPointerMove: SliderRootCommonProps["onPointerMove"] = (event) => {
    if (event.pointerId === activePointerId) {
      const rect = activeTrackRect ?? railRef()?.getBoundingClientRect();
      const percent = rect && getPointerPercent(event, rect, direction());

      if (percent != null) {
        const id = activeThumb();
        if (id != null) {
          event.preventDefault();
          updateThumbValue(id, getPercentValue(percent));
        }
      }
    }
  };

  const onPointerUp: typeof local.onPointerUp = (event) => {
    if (event.pointerId === activePointerId) {
      event.preventDefault();
      releasePointer();
      setActiveThumb(undefined);
    }
  };

  const onPointerCancel: typeof local.onPointerCancel = (event) => {
    if (event.pointerId === activePointerId) {
      releasePointer();
      setActiveThumb(undefined);
    }
  };

  const style = createMemo(() =>
    mergeStyle(
      {
        position: "relative",
        "touch-action": "none",
      },
      local.style,
    ),
  );

  const context = {
    step: () => local.step,
    disabled: () => local.disabled,
    keyboard: () => local.keyboard,
    direction,
    values,
    thumbs,
    getValuePercent,

    isActive: createSelector(activeThumb),
    setActiveThumb,

    setThumbValue: updateThumbValue,
    beginSlide,
    setRailRef,
  } satisfies SliderContextValue;

  return (
    <SliderContext.Provider value={context}>
      <Polymorphic<SliderRootElementProps<ElementOf<T>>>
        as="div"
        role="group"
        style={style()}
        onPointerDown={composeHandlers(local.onPointerDown, onPointerDown)}
        onPointerMove={composeHandlers(local.onPointerDown, onPointerMove)}
        onPointerUp={composeHandlers(local.onPointerDown, onPointerUp)}
        onPointerCancel={composeHandlers(local.onPointerDown, onPointerCancel)}
        {...rest}
      />
    </SliderContext.Provider>
  );
}
