import { error } from "@solid-component/utils";
import { Accessor, createContext, useContext } from "solid-js";

export type FieldHTMLElement = HTMLInputElement | HTMLTextAreaElement;

type OverflowFormatter = (value: string, options: { max: number }) => string;

type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export interface CounterConfig {
  max?: number;
  strategy?: (value: string) => number;
  overflowFormatter?: OverflowFormatter;
}

export interface NormalizedCounterConfig extends RequiredBy<
  CounterConfig,
  "strategy"
> {}

export interface FieldContextValue {
  disabled: Accessor<boolean>;
  readonly: Accessor<boolean>;

  counter: Accessor<NormalizedCounterConfig>;

  value: Accessor<string>;
  setValue: (value: string) => void;

  fieldRef: Accessor<FieldHTMLElement | undefined>;
  setFieldRef: (el: FieldHTMLElement) => void;

  clear: VoidFunction;
}

export const FieldContext = createContext<FieldContextValue>();

export function useFieldContext() {
  const context = useContext(FieldContext);

  if (!context) {
    error("Field components must be used within <Field.Root>.", {
      package: "field",
    });
  }

  return context;
}
