import { Ref } from "solid-js";

type MaybeRef<T> = Ref<T> | undefined;

export function mergeRefs<T>(...refs: MaybeRef<T>[]): (el: T) => void {
  return (...args) => {
    for (const ref of refs) {
      ref && (ref as any)(...args);
    }
  };
}
