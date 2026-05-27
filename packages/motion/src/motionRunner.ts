import { noop } from "@solid-primitive/shared";
import { makeEventListener } from "@solid-primitive/web";
import type { Accessor } from "solid-js";
import type { MotionEndEvent, MotionName, MotionStatus, MotionStep } from "./types";
import { forceReflow, getMotionClassNames, removeMotionClasses } from "./util";

export interface MotionHandlers {
  prepare?: (el: HTMLElement) => void | Promise<void>;
  start?: (el: HTMLElement) => void;
  active?: (el: HTMLElement) => void;
  end?: (el: HTMLElement, event: MotionEndEvent) => boolean | void;
}

interface MotionRunnerOptions {
  element: Accessor<HTMLElement | undefined>;
  name: Accessor<MotionName | undefined>;
  deadline: Accessor<number | undefined>;
  onStep?: (
    status: MotionStatus,
    step: Exclude<MotionStep, "idle" | "end">,
    hidden: boolean,
  ) => void;
  onFinish?: (hidden: boolean) => void;
}

export function createMotionRunner(options: MotionRunnerOptions) {
  let disposed = false;
  let motionRunId = 0;
  let endCleanup: VoidFunction = noop;

  const cleanup = () => {
    disposed = true;
    endCleanup();
  };

  const shouldWaitForMotionEnd = (status: MotionStatus) => {
    const { root, phase, step } = getMotionClassNames(options.name(), status, "active");
    return !!root || !!phase || !!step || options.deadline() != null;
  };

  const applyMotionStepClasses = (
    el: HTMLElement,
    status: MotionStatus,
    step: Exclude<MotionStep, "idle" | "end">,
  ) => {
    removeMotionClasses(el, options.name());
    const { root, phase, step: stepClass } = getMotionClassNames(options.name(), status, step);
    const classes = [root, phase, stepClass].filter(Boolean) as string[];
    if (classes.length > 0) {
      el.classList.add(...classes);
    }
  };

  const finishMotion = (hidden: boolean) => {
    endCleanup();
    const el = options.element();
    if (el) {
      removeMotionClasses(el, options.name());
    }
    options.onFinish?.(hidden);
  };

  const completeImmediately = (
    el: HTMLElement,
    hidden: boolean,
    handlers: MotionHandlers,
    done: () => void,
  ) => {
    void handlers.prepare?.(el);
    handlers.start?.(el);
    handlers.active?.(el);
    handlers.end?.(el, { deadline: true } as MotionEndEvent);
    finishMotion(hidden);
    done();
  };

  const runMotion = (
    status: MotionStatus,
    enabled: boolean,
    hiddenDuringMotion: boolean,
    hiddenAfterDone: boolean,
    handlers: MotionHandlers,
    done: () => void,
  ) => {
    const el = options.element();
    if (!el) {
      options.onFinish?.(hiddenAfterDone);
      done();
      return;
    }

    const runId = ++motionRunId;

    endCleanup();

    if (!enabled || !shouldWaitForMotionEnd(status)) {
      completeImmediately(el, hiddenAfterDone, handlers, done);
      return;
    }

    const advance = async () => {
      options.onStep?.(status, "prepare", hiddenDuringMotion);
      applyMotionStepClasses(el, status, "prepare");
      await handlers.prepare?.(el);

      if (disposed || runId !== motionRunId || options.element() !== el) {
        return;
      }

      handlers.start?.(el);
      options.onStep?.(status, "start", hiddenDuringMotion);
      applyMotionStepClasses(el, status, "start");

      forceReflow(el);
      handlers.active?.(el);
      options.onStep?.(status, "active", hiddenDuringMotion);
      applyMotionStepClasses(el, status, "active");

      const tryComplete = (event: MotionEndEvent) => {
        if (!event.deadline && el !== event.target) return;
        if (runId !== motionRunId) return;
        if (handlers.end?.(el, event) === false) return;
        finishMotion(hiddenAfterDone);
        done();
      };

      const cleanupListeners = makeEventListener(el, ["transitionend", "animationend"], tryComplete);
      const deadlineTimer =
        options.deadline() != null
          ? setTimeout(() => {
              tryComplete({ deadline: true } as MotionEndEvent);
            }, options.deadline())
          : null;

      endCleanup = () => {
        cleanupListeners();
        if (deadlineTimer != null) {
          clearTimeout(deadlineTimer);
        }
        endCleanup = noop;
      };
    };

    void advance();
  };

  return {
    cleanup,
    runMotion,
  };
}
