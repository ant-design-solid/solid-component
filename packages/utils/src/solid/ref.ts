import { JSX, Ref } from "solid-js";

type MaybeRef<T> = Ref<T> | undefined;

/**
 * Check shallow array equality
 */
export const arrayEquals = (
  a: readonly unknown[],
  b: readonly unknown[],
): boolean =>
  a === b || (a.length === b.length && a.every((e, i) => e === b[i]));

/**
 * Returns a function that will call all functions in the order they were chained with the same arguments.
 */
export function chain<Args extends [] | any[]>(callbacks: {
  [Symbol.iterator](): IterableIterator<((...args: Args) => any) | undefined>;
}): (...args: Args) => void {
  return (...args: Args) => {
    for (const callback of callbacks) callback && callback(...args);
  };
}

export function mergeRefs<T>(...refs: MaybeRef<T>[]): (el: T) => void {
  return chain(refs as ((el: T) => void)[]);
}

/**
 * Utility for resolving recursively nested JSX children in search of the first element that matches a predicate.
 *
 * It does **not** create a computation - should be wrapped in one to repeat the resolution on changes.
 *
 * @param value JSX children
 * @param predicate predicate to filter elements
 * @returns single found element or `null` if no elements were found
 */
export function getFirstChild<T extends object = Element>(
  value: JSX.Element,
  predicate: (item: JSX.Element | T) => item is T,
): T | null {
  if (predicate(value)) return value;
  if (typeof value === "function" && !(value as () => JSX.Element).length)
    return getFirstChild((value as () => JSX.Element)(), predicate);
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = getFirstChild(item, predicate);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Utility for resolving recursively nested JSX children to a single element or an array of elements using a predicate.
 *
 * It does **not** create a computation - should be wrapped in one to repeat the resolution on changes.
 *
 * @param value JSX children
 * @param predicate predicate to filter elements
 * @returns single element or an array of elements or `null` if no elements were found
 */
export function getResolvedElements<T extends object>(
  value: JSX.Element,
  predicate: (item: JSX.Element | T) => item is T,
): T[] | [] {
  if (predicate(value)) return [value];
  if (typeof value === "function" && !(value as () => JSX.Element).length)
    return getResolvedElements((value as () => JSX.Element)(), predicate);

  if (Array.isArray(value)) {
    const results: T[] = [];
    for (const item of value) {
      const result = getResolvedElements(item, predicate);
      if (result)
        Array.isArray(result)
          ? results.push.apply(results, result)
          : results.push(result);
    }
    return results.length ? results : [];
  }
  return [];
}
