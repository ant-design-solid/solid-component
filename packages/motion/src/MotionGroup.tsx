import { getResolvedElements, isHTMLElement } from "@solid-component/utils";
import { makeEventListener } from "@solid-primitive/event-listener";
import { noop } from "@solid-primitive/utils";
import {
  children,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  untrack,
  type JSX,
} from "solid-js";
import { isServer } from "solid-js/web";
import createMotionRunner, { MotionRunner } from "./motionRunner";
import {
  MotionStep,
  type MotionLifecycle,
  type MotionName,
  type MotionStatus,
} from "./types";
import {
  forceReflow,
  genHandlers,
  getMotionClassNames,
  resolveMotionPhaseName,
} from "./util";

export interface MotionGroupOwnProps
  extends MotionLifecycle, Partial<Record<MotionStatus, boolean>> {
  children?: JSX.Element;
  name?: MotionName;
  deadline?: number;
}

export type MotionGroupProps = MotionGroupOwnProps;

interface MotionGroupEntry {
  el: HTMLElement;
  removing: boolean;
  runner: MotionRunner;
  motionClassNames: string[];
  stopMotionEnd: VoidFunction;
  stopMove?: VoidFunction;
}

const defaults = {
  appear: true,
  enter: true,
  leave: true,
} as const;

export default function MotionGroup(props: MotionGroupProps) {
  const merged = mergeProps(defaults, props as MotionGroupProps);
  const resolvedChildren = children(() => merged.children);
  if (isServer) {
    return resolvedChildren();
  }

  const elements = createMemo(() =>
    getResolvedElements(resolvedChildren(), isHTMLElement),
  );
  const entryMap = new Map<HTMLElement, MotionGroupEntry>();
  const exiting = new WeakSet<HTMLElement>();
  const [toRemove, setToRemove] = createSignal<HTMLElement[]>([], {
    equals: false,
  });
  let prevSet = new Set<HTMLElement>(merged.appear ? undefined : elements());
  let initialized = false;

  const name = () => merged.name;
  const deadline = () => merged.deadline;
  const motionHandlers = genHandlers(merged);

  const getClassNames = (
    status: MotionStatus,
    step: Exclude<MotionStep, "end">,
  ) => {
    const {
      root,
      phase,
      step: stepClass,
    } = getMotionClassNames(name(), status, step);

    return [root, phase, stepClass].filter(Boolean) as string[];
  };

  const createEntry = (el: HTMLElement): MotionGroupEntry => {
    const runner = createMotionRunner({
      name,
      deadline,
      async onStep(status, step, classNames) {
        const handler = motionHandlers[status][step];
        setClassNames(entry, classNames);

        if (step === "prepare") {
          entry.stopMotionEnd();
          await handler?.(entry.el);
        } else if (step === "start") {
          handler?.(entry.el);
          forceReflow(entry.el);
        } else {
          handler?.(entry.el);
          entry.stopMotionEnd = bindMotionEnd(entry);
        }
      },
      onEnd(status, event) {
        return motionHandlers[status].end?.(entry.el, event);
      },
    });

    const entry: MotionGroupEntry = {
      el,
      removing: false,
      runner,
      motionClassNames: [],
      stopMotionEnd: noop,
    };

    return entry;
  };

  const cleanupEntry = (entry: MotionGroupEntry) => {
    entry.stopMove?.();
    entry.stopMotionEnd();
    entry.runner.stop();
    setClassNames(entry, []);
    entryMap.delete(entry.el);
  };

  const finishRemoved = (elements: HTMLElement[]) => {
    setToRemove((prev) => {
      prev.push(...elements);
      return prev;
    });

    for (const el of elements) {
      exiting.delete(el);
    }
  };

  const startEntryMotion = (entry: MotionGroupEntry, status: MotionStatus) => {
    entry.runner.start(status, {
      enabled: merged[status],
      onFinish() {
        entry.stopMotionEnd();
        setClassNames(entry, []);

        if (status === "leave") {
          if (entry.removing && entryMap.get(entry.el) === entry) {
            finishRemoved([entry.el]);
          }
        }
      },
    });
  };

  const setClassNames = (entry: MotionGroupEntry, classNames: string[]) => {
    const prev = entry.motionClassNames;
    if (prev.length > 0) {
      entry.el.classList.remove(...prev);
    }

    entry.motionClassNames = classNames;

    if (classNames.length > 0) {
      entry.el.classList.add(...classNames);
    }
  };

  const bindMotionEnd = (entry: MotionGroupEntry) => {
    const cleanup = makeEventListener(
      entry.el,
      ["transitionend", "animationend"],
      (event) => {
        if (event.target !== entry.el) return;

        if (entry.runner.finish(event)) {
          entry.stopMotionEnd();
        }
      },
    );

    return () => {
      cleanup();
      entry.stopMotionEnd = noop;
    };
  };

  const collectRects = (elements: readonly HTMLElement[]) => {
    const rects = new Map<HTMLElement, DOMRect>();

    for (const el of elements) {
      if (el.isConnected) {
        rects.set(el, el.getBoundingClientRect());
      }
    }

    return rects;
  };

  const runMoveMotion = (
    elements: readonly HTMLElement[],
    prevRects: ReadonlyMap<HTMLElement, DOMRect>,
    nextRects: ReadonlyMap<HTMLElement, DOMRect>,
  ) => {
    const moveClassName = resolveMotionPhaseName(merged.name, "move");

    if (!moveClassName) return;

    const moveClasses = moveClassName.split(/\s+/).filter(Boolean);
    const moved: Array<{
      el: HTMLElement;
      transform: string;
      transitionDuration: string;
    }> = [];

    for (const el of elements) {
      const entry = entryMap.get(el);
      const prevRect = prevRects.get(el);
      const nextRect = nextRects.get(el);

      if (!entry || !prevRect || !nextRect) continue;

      const deltaX = prevRect.left - nextRect.left;
      const deltaY = prevRect.top - nextRect.top;

      if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) continue;

      entry.stopMove?.();

      const transform = el.style.transform;
      const transitionDuration = el.style.transitionDuration;
      const translate = `translate(${deltaX}px, ${deltaY}px)`;

      el.style.transform = transform ? `${translate} ${transform}` : translate;
      el.style.transitionDuration = "0s";
      moved.push({ el, transform, transitionDuration });
    }

    if (!moved.length) return;

    forceReflow(document.body);

    for (const item of moved) {
      const { el, transform, transitionDuration } = item;
      const entry = entryMap.get(el);

      if (!entry) continue;

      const stopMove = () => {
        off();
        el.classList.remove(...moveClasses);
        entry.stopMove = undefined;
      };
      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target !== el) return;
        if (event.propertyName && !/transform$/.test(event.propertyName)) {
          return;
        }

        stopMove();
      };

      entry.stopMove = stopMove;
      el.classList.add(...moveClasses);
      el.style.transform = transform;
      el.style.transitionDuration = transitionDuration;
      const off = makeEventListener(el, "transitionend", onTransitionEnd);
    }
  };

  function handleChange(change: {
    added: HTMLElement[];
    removed: HTMLElement[];
    unchanged: HTMLElement[];
    prevRects: ReadonlyMap<HTMLElement, DOMRect>;
  }) {
    const startQueue: Array<{
      entry: MotionGroupEntry;
      status: MotionStatus;
    }> = [];
    const enterQueue: Array<{
      entry: MotionGroupEntry;
      status: MotionStatus;
    }> = [];
    const leaveQueue: MotionGroupEntry[] = [];

    for (const el of change.added) {
      const entry = entryMap.get(el);

      if (!entry) continue;
      startQueue.push({
        entry,
        status: initialized ? "enter" : "appear",
      });
    }

    for (const el of change.removed) {
      const entry = entryMap.get(el);

      if (!entry) continue;
      startQueue.push({ entry, status: "leave" });
    }

    for (const { entry, status } of startQueue) {
      if (entryMap.get(entry.el) !== entry) continue;
      if (status !== "leave" && entry.removing) continue;
      if (status === "leave" && !entry.removing) continue;

      if (status === "leave") {
        leaveQueue.push(entry);
      } else {
        if (merged[status]) {
          setClassNames(entry, getClassNames(status, "start"));
        }
        enterQueue.push({ entry, status });
      }
    }

    for (const entry of leaveQueue) {
      startEntryMotion(entry, "leave");
    }

    queueMicrotask(() => {
      runMoveMotion(
        change.unchanged,
        change.prevRects,
        collectRects(change.unchanged),
      );

      for (const { entry, status } of enterQueue) {
        if (entryMap.get(entry.el) !== entry) continue;
        if (entry.removing) continue;

        startEntryMotion(entry, status);
      }
    });
  }

  onCleanup(() => {
    for (const entry of entryMap.values()) {
      cleanupEntry(entry);
    }

    entryMap.clear();
  });

  const renderElements = createMemo<HTMLElement[]>(
    (prev) => {
      const removedElements = toRemove();
      const sourceElements = elements();
      const prevRects = collectRects(prev);

      if (removedElements.length) {
        const removedSet = new Set(removedElements);
        const next = prev.filter((el) => !removedSet.has(el));

        removedElements.length = 0;

        for (const el of removedSet) {
          const entry = entryMap.get(el);

          if (entry?.removing) {
            cleanupEntry(entry);
          }
        }

        queueMicrotask(() => {
          runMoveMotion(next, prevRects, collectRects(next));
        });

        return next;
      }

      return untrack(() => {
        const sourceSet = new Set(sourceElements);
        const next = sourceElements.slice();
        const added: HTMLElement[] = [];
        const removed: HTMLElement[] = [];
        const unchanged: HTMLElement[] = [];
        let nothingChanged = true;

        for (const el of sourceElements) {
          let entry = entryMap.get(el);

          if (!entry) {
            entry = createEntry(el);
            entryMap.set(el, entry);
          }

          if (entry.removing) {
            entry.removing = false;
            exiting.delete(el);
          }

          if (prevSet.has(el)) {
            unchanged.push(el);
          } else {
            added.push(el);
          }
        }

        for (let index = 0; index < prev.length; index += 1) {
          const el = prev[index]!;

          if (!sourceSet.has(el)) {
            const entry = entryMap.get(el);

            if (entry && !exiting.has(el)) {
              entry.removing = true;
              exiting.add(el);
              removed.push(el);
            }

            next.splice(Math.min(index, next.length), 0, el);
          }

          if (nothingChanged && el !== next[index]) {
            nothingChanged = false;
          }
        }

        if (!added.length && !removed.length && nothingChanged) {
          initialized = true;
          return prev;
        }

        handleChange({
          added,
          removed,
          unchanged,
          prevRects,
        });

        prevSet = sourceSet;
        initialized = true;
        return next;
      });
    },
    merged.appear ? [] : elements().slice(),
  );

  return <>{renderElements()}</>;
}
