import { noop } from "@solid-primitive/utils";
import { makeEventListener } from "@solid-primitive/event-listener";
import { onCleanup, type Accessor } from "solid-js";
import type {
  MotionEndEvent,
  MotionName,
  MotionStatus,
  MotionStep,
} from "./types";
import { forceReflow, getMotionClassNames, removeMotionClasses } from "./util";

export interface MotionHandlers {
  prepare?: (el: HTMLElement) => void | Promise<void>;
  start?: (el: HTMLElement) => void;
  active?: (el: HTMLElement) => void;
  end?: (el: HTMLElement, event: MotionEndEvent) => boolean | void;
}

interface MotionRunnerOptions {
  deadline?: Accessor<number | undefined>;
  onStep?: (
    status: MotionStatus,
    step: Exclude<MotionStep, "idle" | "end">,
    hidden: boolean,
  ) => void;
  onFinish?: (hidden: boolean) => void;
}

type ActiveMotionConfig = {
  deadline: number | undefined;
  name: MotionName | undefined;
};

export function createMotionRunner(
  element: Accessor<HTMLElement | undefined>,
  name: Accessor<MotionName | undefined>,
  options: MotionRunnerOptions = {},
) {
  const { deadline, onStep = noop, onFinish = noop } = options;

  let disposed = false;
  let motionRunId = 0;
  let endCleanup: VoidFunction = noop;

  const shouldWaitForMotionEnd = (
    status: MotionStatus,
    config: ActiveMotionConfig,
  ) => {
    const { root, phase, step } = getMotionClassNames(
      config.name,
      status,
      "active",
    );
    return !!root || !!phase || !!step || config.deadline != null;
  };

  const applyMotionStepClasses = (
    el: HTMLElement,
    name: MotionName | undefined,
    status: MotionStatus,
    step: Exclude<MotionStep, "idle" | "end">,
  ) => {
    removeMotionClasses(el, name);
    const {
      root,
      phase,
      step: stepClass,
    } = getMotionClassNames(name, status, step);
    const classes = [root, phase, stepClass].filter(Boolean) as string[];
    if (classes.length > 0) {
      el.classList.add(...classes);
    }
  };

  const finishMotion = (hidden: boolean, config: ActiveMotionConfig) => {
    endCleanup();
    const el = element();
    if (el) {
      removeMotionClasses(el, config.name);
    }
    onFinish(hidden);
  };

  const runMotion = (
    status: MotionStatus,
    enabled: boolean,
    hiddenDuringMotion: boolean,
    hiddenAfterDone: boolean,
    handlers: MotionHandlers,
    done: () => void,
  ) => {
    const el = element();
    if (!el) {
      onFinish(hiddenAfterDone);
      done();
      return;
    }

    const runId = ++motionRunId;
    let completed = false;
    const config = {
      deadline: deadline?.(),
      name: name(),
    };

    const complete = (event: MotionEndEvent) => {
      if (completed || runId !== motionRunId) {
        return;
      }

      if (handlers.end?.(el, event) === false) {
        return;
      }

      completed = true;
      finishMotion(hiddenAfterDone, config);
      done();
    };

    endCleanup();

    const shouldWait = shouldWaitForMotionEnd(status, config);
    if (!enabled || !shouldWait) {
      // motion 被显式禁用时跳过 prepare；否则保留 prepare 语义，只是不等待结束事件。
      if (!!enabled) {
        void handlers.prepare?.(el);
      }
      handlers.start?.(el);
      handlers.active?.(el);
      handlers.end?.(el, { deadline: true } as MotionEndEvent);
      finishMotion(hiddenAfterDone, config);
      done();
      return;
    }

    const runStep = (
      step: Exclude<MotionStep, "idle" | "end">,
      callback?: (el: HTMLElement) => void,
    ) => {
      callback?.(el);
      onStep(status, step, hiddenDuringMotion);
      applyMotionStepClasses(el, config.name, status, step);
    };

    const advance = async () => {
      onStep(status, "prepare", hiddenDuringMotion);
      applyMotionStepClasses(el, config.name, status, "prepare");
      await handlers.prepare?.(el);

      if (disposed || completed || runId !== motionRunId || element() !== el) {
        return;
      }

      runStep("start", handlers.start);

      forceReflow(el);
      runStep("active", handlers.active);

      const tryComplete = (event: MotionEndEvent) => {
        if (!event.deadline && el !== event.target) return;
        complete(event);
      };

      const cleanupListeners = makeEventListener(
        el,
        ["transitionend", "animationend"],
        tryComplete,
      );
      const deadlineTimer =
        config.deadline != null
          ? setTimeout(() => {
              tryComplete({ deadline: true } as MotionEndEvent);
            }, config.deadline)
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

  onCleanup(() => {
    disposed = true;
    endCleanup();
  });

  return {
    start: runMotion,
    stop: () => {
      endCleanup();
    },
  };
}
