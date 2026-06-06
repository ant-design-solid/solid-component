import { createCollection } from "@solid-primitive/shared";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
} from "solid-js";
import { makeRaf } from "../raf";
import { warning } from "../warn";

export type OrderedRegistryUid = symbol | string;

export interface OrderedRegistryRecord {
  uid: OrderedRegistryUid;
  ref: Accessor<HTMLElement | undefined>;
  index?: Accessor<number | undefined>;
}

export interface CreateOrderedRegistryOptions {
  rootRef?: Accessor<HTMLElement | undefined>;
  package?: string;
}

function compareDomOrder(
  a: HTMLElement | undefined,
  b: HTMLElement | undefined,
) {
  if (!a || !b || a === b) {
    return 0;
  }

  const position = a.compareDocumentPosition(b);

  if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  }

  if (position & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1;
  }

  return 0;
}

export function createOrderedRegistry<T extends OrderedRegistryRecord>(
  options: CreateOrderedRegistryOptions = {},
) {
  const { package: pkg, rootRef } = options;
  const registry = createCollection(new Map<OrderedRegistryUid, T>());
  const orderMap = createCollection(new Map<OrderedRegistryUid, number>());
  const [ordered, setOrdered] = createSignal<T[]>([]);
  const [raf, cancelRaf] = makeRaf();

  const items = createMemo(() => Array.from(registry.values()));
  const isDomMode = createMemo(() => {
    const list = items();
    const hasIndexed = list.some((record) => record.index?.() !== undefined);
    const hasUnindexed = list.some((record) => record.index?.() === undefined);

    if (hasIndexed && hasUnindexed) {
      warning(
        "Mixed indexed and unindexed items detected. Falling back to DOM order.",
        {
          package: pkg,
          once: true,
        },
      );
    }

    return !hasIndexed || hasUnindexed;
  });

  const commitOrder = (next: T[]) => {
    const previous = ordered();
    if (
      previous.length === next.length &&
      previous.every((record, index) => record.uid === next[index]?.uid)
    ) {
      return;
    }

    batch(() => {
      setOrdered(next);

      next.forEach((record, order) => {
        if (orderMap.get(record.uid) !== order) {
          orderMap.set(record.uid, order);
        }
      });
    });
  };

  const sortByIndex = (list: T[]) =>
    list.slice().sort((a, b) => {
      const aIndex = a.index?.() ?? 0;
      const bIndex = b.index?.() ?? 0;
      return aIndex - bIndex;
    });

  const sortByDom = (list: T[]) =>
    list.slice().sort((a, b) => {
      const domOrder = compareDomOrder(a.ref(), b.ref());
      if (domOrder !== 0) {
        return domOrder;
      }

      const aIndex = a.index?.() ?? 0;
      const bIndex = b.index?.() ?? 0;

      return aIndex - bIndex;
    });

  const sort = () => {
    const list = items();
    const useDom = isDomMode();

    const next = !useDom ? sortByIndex(list) : sortByDom(list);
    commitOrder(next);
  };

  createEffect(() => {
    const list = items();
    const useDom = isDomMode();

    untrack(() => {
      if (useDom) {
        raf(sort);
      } else {
        commitOrder(sortByIndex(list));
      }
    });
  });

  createEffect(() => {
    if (!isDomMode()) {
      return;
    }

    const root = rootRef?.();

    if (!root || typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(() => {
      raf(sort);
    });

    observer.observe(root, { childList: true });
    onCleanup(() => {
      observer.disconnect();
      cancelRaf();
    });
  });

  onCleanup(cancelRaf);

  const register = (entry: T) => {
    registry.set(entry.uid, entry);
  };

  const unregister = (uid: OrderedRegistryUid) => {
    registry.delete(uid);
    orderMap.delete(uid);
  };
  const getOrder = (val: OrderedRegistryRecord | OrderedRegistryUid) => {
    const uid = typeof val === "object" ? val.uid : val;
    return orderMap.get(uid);
  };

  return {
    registry,
    items,
    ordered,
    getOrder,
    register,
    unregister,
  } as const;
}
