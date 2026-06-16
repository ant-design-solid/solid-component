import { access, noop, type MaybeAccessor } from "@solid-primitive/utils";
import { createSignal } from "solid-js";
import type {
  MotionEndEvent,
  MotionName,
  MotionStatus,
  MotionStep,
} from "./types";
import { getMotionClassNames } from "./util";

type InternalMotionStep = Exclude<MotionStep, "end">;

export interface MotionRunnerState {
  status?: MotionStatus;
  step?: InternalMotionStep;
  classNames: string[];
}

export interface MotionRunnerOptions {
  name?: MaybeAccessor<MotionName | undefined>;
  deadline?: MaybeAccessor<number | undefined>;
  onStep?: (
    status: MotionStatus,
    step: InternalMotionStep,
    classNames: string[],
  ) => void | Promise<void>;
  onEnd?: (
    status: MotionStatus,
    event?: MotionEndEvent,
    options?: {
      force?: boolean;
    },
  ) => boolean | void;
}

export interface MotionStartOptions {
  enabled?: boolean;
  onFinish?: () => void;
}

const idleState: MotionRunnerState = {
  classNames: [],
};

function getStepClassNames(
  name: MotionName | undefined,
  status: MotionStatus,
  step: InternalMotionStep,
) {
  const {
    root,
    phase,
    step: stepClass,
  } = getMotionClassNames(name, status, step);

  return [root, phase, stepClass].filter(Boolean) as string[];
}

function shouldWaitForMotionEnd(
  name: MotionName | undefined,
  status: MotionStatus,
  deadline: number | undefined,
) {
  return (
    getStepClassNames(name, status, "active").length > 0 || deadline != null
  );
}

function nextFrame(fn: () => void) {
  let frameId = requestAnimationFrame(() => {
    frameId = requestAnimationFrame(fn);
  });

  return () => {
    cancelAnimationFrame(frameId);
  };
}
const returnFalse = () => false
export default function createMotionRunner(options: MotionRunnerOptions = {}) {
  const { onEnd = noop, onStep = noop } = options;
  const [state, setState] = createSignal<MotionRunnerState>(idleState);

  let runId = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let currentFinish: (event?: MotionEndEvent) => boolean = returnFalse;
  let cancelFrame = noop;

  const cleanupTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const stop = () => {
    runId += 1;
    cleanupTimer();
    currentFinish = returnFalse;
    setState(idleState);
    cancelFrame();
  };

  const start = (
    status: MotionStatus,
    startOptions: MotionStartOptions = {},
  ) => {
    const { enabled = true, onFinish = noop } = startOptions;
    const name = access(options.name);
    const deadline = access(options.deadline);
    const currentRunId = runId + 1;
    let finished = false;

    stop();
    runId = currentRunId;

    const isStale = () => finished || runId !== currentRunId;

    const finish = (
      event?: MotionEndEvent,
      finishOptions: {
        callEnd?: boolean;
        force?: boolean;
      } = {},
    ) => {
      const { callEnd = true, force = false } = finishOptions;

      if (isStale()) return false;

      if (callEnd && onEnd(status, event, { force }) === false && !force) {
        return false;
      }

      finished = true;
      cleanupTimer();
      currentFinish = returnFalse;
      setState(idleState);
      onFinish();
      return true;
    };

    currentFinish = finish;

    const setStep = (step: InternalMotionStep) => {
      const classNames = getStepClassNames(name, status, step);

      setState({
        status,
        step,
        classNames,
      });

      return onStep(status, step, classNames);
    };

    const advance = async () => {
      if (!enabled) {
        finish({ deadline: true }, { callEnd: false });
        return;
      }

      await setStep("prepare");

      if (isStale()) return;

      await setStep("start");

      if (isStale()) return;

      cancelFrame();
      await new Promise<void>((resolve) => {
        cancelFrame = nextFrame(resolve);
      });

      await setStep("active");

      if (!shouldWaitForMotionEnd(name, status, deadline)) {
        finish({ deadline: true }, { force: true });
        return;
      }

      if (deadline != null) {
        timer = setTimeout(() => {
          finish({ deadline: true }, { force: true });
        }, deadline);
      }
    };

    void advance();

    return finish;
  };

  return {
    state,
    start,
    finish(event?: MotionEndEvent) {
      return currentFinish(event);
    },
    stop,
  };
}

export type MotionRunner = ReturnType<typeof createMotionRunner>;
