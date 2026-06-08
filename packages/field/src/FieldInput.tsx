import Polymorphic, { PolymorphicProps } from "@solid-component/polymorphic";
import { callHandler, mergeRefs } from "@solid-component/utils";
import { ValueOf } from "@solid-primitive/utils";
import {
  createEffect,
  createSignal,
  JSX,
  splitProps,
  untrack
} from "solid-js";
import { useFieldContext, type FieldHTMLElement } from "./FieldContext";

// type LiteralUnion<T extends U, U> = T | (U & Record<never, never>);

const COMMON_PROPS = [
  "ref",
  "onInput",
  "onFocus",
  "onBlur",
  "onCompositionStart",
  "onCompositionEnd",
  "onKeyDown",
  "onKeyUp",
] as const;

export interface FieldBaseInputCommonProps extends Pick<
  JSX.HTMLAttributes<FieldHTMLElement>,
  ValueOf<typeof COMMON_PROPS>
> {}

export interface FieldBaseInputOwnProps {
  changeOnComposing?: boolean;
  onPressEnter?: JSX.EventHandler<FieldHTMLElement, KeyboardEvent>;
}

interface FieldBaseInputProps
  extends FieldBaseInputCommonProps, FieldBaseInputOwnProps {}

export interface FieldBaseInputElementProps extends FieldBaseInputCommonProps {
  value: string | undefined;
  disabled: boolean | undefined;
  readonly: boolean | undefined;
  "aria-disabled": boolean | undefined;
  "aria-readonly": boolean | undefined;
  type?: "text" | "search" | "password" | "email" | "tel" | "url";
}

export function FieldBaseInput<T extends "input" | "textarea" = "input">(
  props: PolymorphicProps<T, FieldBaseInputProps>,
) {
  const [local, rest] = splitProps(props as FieldBaseInputProps, [
    "onPressEnter",
    "changeOnComposing",
    ...COMMON_PROPS,
  ]);
  const {
    value,
    setValue,
    counter,
    disabled,
    readonly,
    fieldRef,
    setFieldRef,
  } = useFieldContext();

  let isComposing = false;
  let composingValue: string | null;
  let isInternalValueChange = false;
  let previousValue = value();

  let isLockEnter = false;
  const [focused, setFocused] = createSignal(false);

  const triggerChange = (currentValue: string) => {
    if (isComposing && !local.changeOnComposing) {
      return;
    }

    if (composingValue != null) {
      if (currentValue === composingValue) {
        return;
      }

      composingValue = null;
    }

    let value = currentValue;
    const config = counter();
    if (
      !isComposing &&
      config.overflowFormatter &&
      config.max &&
      config.strategy(currentValue) > config.max
    ) {
      value = config.overflowFormatter(currentValue, {
        max: config.max,
      });

      const el = fieldRef();
      if (currentValue !== value && el) {
        el.setSelectionRange(el.selectionStart || 0, el.selectionEnd || 0);
      }
    }

    setValue(value);
  };

  createEffect(() => {
    isLockEnter = false;

    if (untrack(focused) && disabled()) {
      setFocused(false);
    }
  });

  createEffect(() => {
    const currentValue = value();

    // 外部将值置空时，当前输入法临时态已经失效，需要同步清理。
    if (
      !isInternalValueChange &&
      previousValue !== currentValue &&
      currentValue === ""
    ) {
      isComposing = false;
      composingValue = null;
    }

    previousValue = currentValue;
    isInternalValueChange = false;
  });

  const onCompositionStart: FieldBaseInputProps["onCompositionStart"] = (e) => {
    isComposing = true;
    composingValue = null;
    callHandler(e, local.onCompositionStart);
  };
  const onCompositionEnd: FieldBaseInputProps["onCompositionEnd"] = (e) => {
    const changeOnComposing = local.changeOnComposing;
    const currentValue = (e.target as FieldHTMLElement).value;

    isComposing = false;

    if (!changeOnComposing) {
      if (currentValue !== value()) {
        triggerChange(currentValue);
      }

      composingValue = currentValue;
    }

    callHandler(e, local.onCompositionEnd);
  };

  const onFocus: FieldBaseInputProps["onFocus"] = (e) => {
    setFocused(true);
    callHandler(e, local.onFocus);
  };
  const onBlur: FieldBaseInputProps["onBlur"] = (e) => {
    isLockEnter = false;
    setFocused(false);
    callHandler(e, local.onBlur);
  };

  const ENTER = "Enter";
  const onKeyDown: FieldBaseInputProps["onKeyDown"] = (e) => {
    if (e.key === ENTER && !isLockEnter && !e.isComposing) {
      isLockEnter = true;
      local.onPressEnter?.(e);
    }
    callHandler(e, local.onKeyDown);
  };
  const onKeyUp: FieldBaseInputProps["onKeyUp"] = (e) => {
    if (e.key === ENTER) {
      isLockEnter = false;
    }
    callHandler(e, local.onKeyUp);
  };

  const onInput: FieldBaseInputProps["onInput"] = (e) => {
    isInternalValueChange = true;
    triggerChange(e.target.value);
    callHandler(e, local.onInput);
  };

  return (
    <Polymorphic<FieldBaseInputElementProps>
      as="input"
      ref={mergeRefs(setFieldRef, local.ref)}
      value={value()}
      disabled={disabled()}
      readonly={readonly()}
      aria-disabled={disabled()}
      aria-readonly={readonly()}
      onInput={onInput}
      onFocus={onFocus}
      onBlur={onBlur}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      {...rest}
    />
  );
}

export interface FieldInputOwnProps extends FieldBaseInputOwnProps {
  type?: "text" | "search" | "password" | "email" | "tel" | "url";
}

interface FieldInputCommonProps extends FieldBaseInputCommonProps {}

export interface FieldInputProps
  extends FieldInputOwnProps, FieldInputCommonProps {}

export default function FieldInput(
  props: PolymorphicProps<"input", FieldInputProps>,
) {
  return (
    <FieldBaseInput as="input" type="text" {...(props as FieldInputProps)} />
  );
}
