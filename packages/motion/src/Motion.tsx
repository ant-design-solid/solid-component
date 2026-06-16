import { getFirstChild, isElement } from "@solid-component/utils";
import { makeEventListener } from "@solid-primitive/event-listener";
import { access, noop } from "@solid-primitive/utils";
import {
  children,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  Show,
  type JSX,
} from "solid-js";
import createMotionRunner from "./motionRunner";
import { MotionLifecycle, MotionName, type MotionStatus } from "./types";
import { forceReflow, genHandlers } from "./util";

export interface MotionOwnProps
  extends MotionLifecycle, Partial<Record<MotionStatus, boolean>> {
  children?: JSX.Element;
  visible?: boolean;
  name?: MotionName;
  removeOnLeave?: boolean;
  leavedClassName?: string;
  deadline?: number;
  forceRender?: boolean;
  onVisibleChangeEnd?: (visible: boolean) => void;
}

export interface MotionProps extends MotionOwnProps {}

const defaults = {
  appear: true,
  enter: true,
  leave: true,
  removeOnLeave: true,
} as const;

export default function Motion(props: MotionProps) {
  const merged = mergeProps(defaults, props);

  const resolvedChildren = children(() => merged.children);
  const elRef = createMemo(
    () => getFirstChild(resolvedChildren(), isElement) as HTMLElement,
  );
  const initialVisible = !!access(merged.visible);

  let endCleanup: VoidFunction = noop;
  let initialized = false;
  let prevVisible = initialVisible;

  const [present, setPresent] = createSignal(initialVisible);
  const [hasBeenVisible, setHasBeenVisible] = createSignal(initialVisible);
  const [pendingStatus, setPendingStatus] = createSignal<MotionStatus>();

  const motionHandlers = genHandlers(merged);

  const motionRunner = createMotionRunner({
    name: () => merged.name,
    deadline: () => merged.deadline,
    async onStep(status, step) {
      const el = elRef();

      if (!el) return;

      const handler = motionHandlers[status][step] ?? noop;

      if (step === "prepare") {
        endCleanup();
        await handler(el);
      } else if (step === "start") {
        handler(el);
        forceReflow(el);
      } else {
        handler(el);
        endCleanup = bindMotionEnd(el);
      }
    },
    onEnd(status, event) {
      const el = elRef();

      if (!el) return;

      return motionHandlers[status].end?.(el, event);
    },
  });

  const finishVisible = (visible: boolean) => {
    setPresent(visible);
    merged.onVisibleChangeEnd?.(visible);
  };

  const startMotion = (status: MotionStatus) => {
    setPendingStatus(undefined);

    const visibleAfterDone = status !== "leave";
    motionRunner.start(status, {
      enabled: merged[status],
      onFinish() {
        endCleanup();
        finishVisible(visibleAfterDone);
      },
    });
  };

  const queueMotion = (status: MotionStatus) => {
    if (status !== "leave") {
      setPresent(true);
      setHasBeenVisible(true);
    }

    setPendingStatus(status);
  };

  createComputed(() => {
    const nextVisible = !!access(merged.visible);

    if (!initialized) {
      initialized = true;
      prevVisible = nextVisible;

      if (nextVisible) {
        setPresent(true);
        setHasBeenVisible(true);

        if (merged.appear) {
          queueMotion("appear");
        } else {
          merged.onVisibleChangeEnd?.(true);
        }
      } else {
        setPresent(false);
      }

      return;
    }

    if (nextVisible === prevVisible) {
      return;
    }

    prevVisible = nextVisible;

    queueMotion(nextVisible ? "enter" : "leave");
  });

  createEffect(() => {
    const status = pendingStatus();
    const el = elRef();

    if (!status || !el) return;

    startMotion(status);
  });

  onCleanup(() => {
    endCleanup();
    motionRunner.stop();
  });

  const bindMotionEnd = (el: HTMLElement) => {
    const cleanup = makeEventListener(
      el,
      ["transitionend", "animationend"],
      (event) => {
        if (event.target !== el) return;

        if (motionRunner.finish(event)) {
          endCleanup();
        }
      },
    );

    return () => {
      cleanup();
      endCleanup = noop;
    };
  };

  const shouldRender = createMemo(
    () =>
      merged.forceRender ||
      present() ||
      (!merged.removeOnLeave && hasBeenVisible()),
  );

  createEffect(() => {
    const el = elRef();

    if (!el) return;
    const classes = [...motionRunner.state().classNames];

    const leaved = shouldRender() && !present() && !access(merged.visible);
    let memoryDisplay: string | undefined;
    if (leaved) {
      if (merged.leavedClassName) {
        const leavedClasses = merged.leavedClassName
          .split(/\s+/)
          .filter(Boolean);
        classes.push(...leavedClasses);
      } else {
        memoryDisplay = el.style.display;
        el.style.display = "none";
      }
    }

    el.classList.add(...classes);

    onCleanup(() => {
      el.classList.remove(...classes);

      if (memoryDisplay != null) {
        el.style.display = memoryDisplay;
        memoryDisplay = undefined;
      }
    });
  });

  return <Show when={shouldRender()}>{resolvedChildren()}</Show>;
}
