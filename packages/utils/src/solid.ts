import { Accessor, getOwner, JSX, onCleanup, Ref } from "solid-js";
import { isDev } from "solid-js/web";

export type MaybeAccessor<T = any> = Accessor<T> | T;

export type MaybeAccessorValue<T extends MaybeAccessor<any>> = T extends () => any
  ? ReturnType<T>
  : T;

export type Assign<T, U> = Omit<T, keyof U> & U;

export const access = <T extends MaybeAccessor<any>>(v: T): MaybeAccessorValue<T> =>
  typeof v === "function" && !v.length ? v() : (v as any);

/**
 * 不在组件内运行时会报错
 * */
export const tryOnCleanup: typeof onCleanup = isDev
  ? (fn) => (getOwner() ? onCleanup(fn) : fn)
  : onCleanup;

type MaybeRef<T> = Ref<T> | undefined;
export function mergeRefs<T>(...refs: MaybeRef<T>[]): (el: T) => void {
  return (...args) => {
    for (const ref of refs) {
      ref && (ref as any)(...args);
    }
  };
}

const extractCSSregex = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;

function stringStyleToObject(style: string) {
  const object: JSX.CSSProperties = {};
  let match: any;
  while ((match = extractCSSregex.exec(style))) {
    object[match[1]] = match[2];
  }
  return object;
}

export function mergeStyle<
  K1 extends JSX.CSSProperties | string | undefined,
  K2 extends JSX.CSSProperties | string | undefined,
>(
  a: K1,
  b: K2,
): K1 extends string ? (K2 extends string ? string : JSX.CSSProperties) : JSX.CSSProperties {
  const aIsString = typeof a === "string";
  const bIsString = typeof b === "string";
  if (aIsString && bIsString) return `${a};${b}` as any;
  return {
    ...((aIsString ? stringStyleToObject(a as any) : a) as any),
    ...((bIsString ? stringStyleToObject(b as any) : b) as any),
  };
}
