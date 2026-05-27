import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import {
  callHandler,
  createControllableSignal,
  mergeRefs,
  triggerFocus,
} from "@solid-component/utils";
import {
  createMemo,
  createSignal,
  JSX,
  mergeProps,
  splitProps,
  ValidComponent,
} from "solid-js";
import {
  CounterConfig,
  FieldContext,
  FieldContextValue,
  FieldHTMLElement,
} from "./FieldContext";

export type ValueType = string;

interface FieldExpose {
  focus: FieldHTMLElement["focus"];
  blur: VoidFunction;
  setSelectionRange: FieldHTMLElement["setSelectionRange"];
  select: FieldHTMLElement["select"];
}

export interface FieldRootOwnProps {
  value?: ValueType;
  defaultValue?: ValueType;
  onChange?: (value: ValueType) => void;

  maxlength?: number;
  counter?: CounterConfig;

  disabled?: boolean;
  readonly?: boolean;

  expose?: (context: FieldExpose) => void;
}

interface FieldRootCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, "ref" | "onClick"> {}

export interface FieldRootProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends FieldRootOwnProps, FieldRootCommonProps<ElementOf<T>> {}

const defaults = {
  as: "div",
  disabled: false,
  readonly: false,
  count: {} as CounterConfig,
} as const;
export default function FieldRoot<T extends ValidComponent>(
  props: PolymorphicProps<T, FieldRootProps<T>>,
) {
  const merged = mergeProps(defaults, props as FieldRootProps);
  const [local, rest] = splitProps(merged, [
    "ref",
    "value",
    "defaultValue",
    "onChange",

    "maxlength",
    "count",

    "disabled",
    "readonly",
    "expose",

    "onClick",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    defaultValue: local.defaultValue,
    onChange: (value) => local.onChange?.(value),
  });

  let ref: HTMLElement | undefined;
  const [fieldRef, setFieldRef] = createSignal<FieldHTMLElement>();

  const counterConfig = createMemo(() => {
    const {
      strategy = (value) => value.length,
      overflowFormatter,
      max,
    } = local.count;

    return {
      strategy,
      max: max ?? local.maxlength,
      overflowFormatter,
    };
  });

  const focus: FieldExpose["focus"] = (options) => {
    const el = fieldRef();
    if (el) {
      triggerFocus(el, options);
    }
  };

  props.expose?.({
    focus,
    blur: () => {
      fieldRef()?.blur();
    },
    setSelectionRange: (...args) => {
      fieldRef()?.setSelectionRange(...args);
    },
    select: () => {
      fieldRef()?.select();
    },
  });

  const onClick: FieldRootProps["onClick"] = (e) => {
    if (ref?.contains(e.target as Element)) {
      focus();
    }
    callHandler(e, local.onClick);
  };

  const context = {
    disabled: () => local.disabled,
    readonly: () => local.readonly,

    value,
    setValue,

    counter: counterConfig,

    fieldRef,
    setFieldRef,

    clear: () => {
      setValue("");
      focus();
    },
  } satisfies FieldContextValue;

  return (
    <FieldContext.Provider value={context}>
      <Polymorphic<FieldRootCommonProps>
        ref={mergeRefs(local.ref, (el) => (ref = el))}
        onClick={onClick}
        {...rest}
      ></Polymorphic>
    </FieldContext.Provider>
  );
}
