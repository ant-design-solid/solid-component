import { access, AnyFunction, MaybeAccessor } from "@solid-primitive/shared";
import { Accessor, createMemo, createSignal, untrack } from "solid-js";

export interface CreateControllableSignalProps<T> {
  value?: Accessor<T | undefined>;

  defaultValue?: MaybeAccessor<T>;

  onChange?: (value: T) => void;
}

function accessWith<T>(
  valueOrFn: T,
  ...args: T extends AnyFunction ? Parameters<T> : never
): T extends AnyFunction ? ReturnType<T> : T {
  return typeof valueOrFn === "function"
    ? valueOrFn(...args)
    : (valueOrFn as any);
}

export function createControllableSignal<T>(
  props: CreateControllableSignalProps<T>,
) {
  const [_value, _setValue] = createSignal(access(props.defaultValue));

  const isControlled = createMemo(() => props.value?.() !== undefined);

  const value = createMemo(
    () => (isControlled() ? props.value?.()! : _value()) as T,
  );

  const setValue = (next: Exclude<T, Function> | ((prev: T) => T)) =>
    untrack(() => {
      const nextValue = accessWith(next, value() as T);

      if (!Object.is(nextValue, value())) {
        if (!isControlled()) {
          _setValue(nextValue as Exclude<T, Function>);
        }

        props.onChange?.(nextValue);
      }

      return nextValue;
    });

  return [value, setValue] as const;
}
