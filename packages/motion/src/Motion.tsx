import { createSwitchMotion, makeEventListener } from "@s-primitives/web";
import { noop } from "@s-primitives/shared";
import {
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  untrack,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { ElementOf, Polymorphic, PolymorphicProps } from "@s-components/polymorphic";
import { access, mergeRefs, mergeStyle } from "@s-components/utils";
import {
  type MotionBaseProps,
  type MotionEndEvent,
  type MotionPhase,
  type MotionStatus,
  type MotionStep,
} from "./types";
import { forceReflow, getMotionClassNames, removeMotionClasses } from "./util";

export interface MotionOwnProps<T extends HTMLElement = HTMLElement>
  extends MotionBaseProps {
  ref: T | ((el: T) => void);
  class: string | undefined;
  style: JSX.CSSProperties | string | undefined;
}

export type MotionProps<T extends ValidComponent | HTMLElement = HTMLElement> =
  Partial<MotionOwnProps<ElementOf<T>>>;

interface MotionHandlers {
  prepare?: (el: HTMLElement) => void | Promise<void>;
  start?: (el: HTMLElement) => void;
  active?: (el: HTMLElement) => void;
  end?: (el: HTMLElement, event: MotionEndEvent) => boolean | void;
}

interface MotionState {
  phase: MotionPhase;
  step: MotionStep;
  hidden: boolean;
}

const defaults = {
  as: "div",
  appear: true,
  enter: true,
  leave: true,
  removeOnLeave: true,
} as const;

const idleState = (hidden: boolean): MotionState => ({
  phase: "none",
  step: "idle",
  hidden,
});

export default function Motion<T extends ValidComponent>(
  props: PolymorphicProps<T, MotionProps<T>>,
) {
  const merged = mergeProps(defaults, props as MotionProps);
  const [local, others] = splitProps(merged, [
    "as",
    "visible",
    "name",
    "appear",
    "enter",
    "leave",
    "removeOnLeave",
    "leavedClassName",
    "deadline",
    "forceRender",
    "ref",
    "class",
    "style",
    "children",
    "onVisibleChanged",

    "onAppearPrepare",
    "onAppearStart",
    "onAppearActive",
    "onAppearEnd",
    "onEnterPrepare",
    "onEnterStart",
    "onEnterActive",
    "onEnterEnd",
    "onLeavePrepare",
    "onLeaveStart",
    "onLeaveActive",
    "onLeaveEnd",
  ]);

  const initialVisible = access(local.visible);
  const shouldAppear = !!initialVisible && local.appear;
  let hasAppeared = !shouldAppear;
  let endCleanup: VoidFunction = noop;
  let disposed = false;

  let motionRunId = 0;

  const [elRef, setElRef] = createSignal<HTMLElement>();
  const [motionState, setMotionState] = createSignal<MotionState>(idleState(!initialVisible));
  const [hasBeenVisible, setHasBeenVisible] = createSignal(initialVisible);

  onCleanup(() => {
    disposed = true;
    endCleanup();
  });

  const isMoving = createMemo(() => motionState().phase !== "none");
  const isLeaved = createMemo(() => !isMoving() && motionState().hidden);

  const setStep = (phase: MotionStatus, step: MotionStep, hidden: boolean) => {
    setMotionState({ phase, step, hidden });
  };

  const settle = (hidden: boolean) => {
    setMotionState({ phase: "none", step: "idle", hidden });
    local.onVisibleChanged?.(!hidden);
  };

  const finishMotion = (hidden: boolean) => {
    endCleanup();
    const el = elRef();
    if (el) {
      removeMotionClasses(el, local.name);
    }
    setMotionState({ phase: "none", step: "end", hidden });
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
    settle(hidden);
    done();
  };

  const shouldWaitForMotionEnd = (status: MotionStatus) => {
    const { root, phase, step } = getMotionClassNames(local.name, status, "active");
    return !!root || !!phase || !!step || local.deadline != null;
  };

  const getMotionHandlers = (status: MotionStatus): MotionHandlers => {
    switch (status) {
      case "appear":
        return {
          prepare: local.onAppearPrepare,
          start: local.onAppearStart,
          active: local.onAppearActive,
          end: local.onAppearEnd,
        };
      case "enter":
        return {
          prepare: local.onEnterPrepare,
          start: local.onEnterStart,
          active: local.onEnterActive,
          end: local.onEnterEnd,
        };
      case "leave":
        return {
          prepare: local.onLeavePrepare,
          start: local.onLeaveStart,
          active: local.onLeaveActive,
          end: local.onLeaveEnd,
        };
    }
  };

  const applyMotionStepClasses = (
    el: HTMLElement,
    status: MotionStatus,
    step: Exclude<MotionStep, "idle" | "end">,
  ) => {
    removeMotionClasses(el, local.name);
    const { root, phase, step: stepClass } = getMotionClassNames(local.name, status, step);
    const classes = [root, phase, stepClass].filter(Boolean) as string[];
    if (classes.length > 0) {
      el.classList.add(...classes);
    }
  };

  const runMotion = (el: HTMLElement, status: MotionStatus, enabled: boolean, done: () => void) => {
    const handlers = getMotionHandlers(status);
    const hiddenAfterDone = status === "leave";
    const hiddenDuringMotion = status === "leave" ? false : motionState().hidden;
    const runId = ++motionRunId;

    endCleanup();

    if (!enabled || !shouldWaitForMotionEnd(status)) {
      completeImmediately(el, hiddenAfterDone, handlers, done);
      return;
    }

    const advance = async () => {
      setStep(status, "prepare", hiddenDuringMotion);
      applyMotionStepClasses(el, status, "prepare");
      await handlers.prepare?.(el);

      if (disposed || runId !== motionRunId || untrack(elRef) !== el) {
        return;
      }

      handlers.start?.(el);
      setStep(status, "start", hiddenDuringMotion);
      applyMotionStepClasses(el, status, "start");

      forceReflow(el);
      handlers.active?.(el);
      setStep(status, "active", hiddenDuringMotion);
      applyMotionStepClasses(el, status, "active");

      const tryComplete = (event: MotionEndEvent) => {
        if (!event.deadline && el !== event.target) return;
        if (runId !== motionRunId) {
          return;
        }
        if (handlers.end?.(el, event) === false) {
          return;
        }
        finishMotion(hiddenAfterDone);
        settle(hiddenAfterDone);
        done();
      };

      const cleanup = makeEventListener(el, ["transitionend", "animationend"], tryComplete);
      const deadlineTimer =
        local.deadline != null
          ? setTimeout(() => {
              tryComplete({ deadline: true } as MotionEndEvent);
            }, local.deadline)
          : null;

      endCleanup = () => {
        cleanup();
        deadlineTimer && clearTimeout(deadlineTimer);
        endCleanup = noop;
      };
    };

    void advance();
  };

  const items = createSwitchMotion(
    () => (access(local.visible) ? ("visible" as const) : undefined),
    {
      mode: "out-in",
      appear: shouldAppear,
      onEnter(_el: "visible", done: () => void) {
        requestAnimationFrame(() => {
          if (disposed) return;
          const el = untrack(elRef);
          if (!el) {
            settle(false);
            done();
            return;
          }

          const status: MotionStatus = shouldAppear && !hasAppeared ? "appear" : "enter";
          hasAppeared = true;
          setHasBeenVisible(true);
          runMotion(el, status, status === "appear" ? shouldAppear : local.enter, done);
        });
      },
      onExit(_el: "visible" | undefined, done: () => void) {
        const el = untrack(elRef);
        if (!el) {
          settle(true);
          done();
          return;
        }

        runMotion(el, "leave", local.leave, done);
      },
    },
  );

  const shouldRender = createMemo(
    () => local.forceRender || items().length > 0 || (!local.removeOnLeave && hasBeenVisible()),
  );

  const attrs = createMemo(() => {
    const classes = [local.class];
    let style = local.style ?? {};

    if (isLeaved()) {
      if (local.leavedClassName) {
        classes.unshift(local.leavedClassName);
      } else {
        style = mergeStyle(style, { display: "none" });
      }
    }

    return {
      class: classes.filter(Boolean).join(" ") || undefined,
      style,
    };
  });

  return (
    <Show when={shouldRender()}>
      <Polymorphic<MotionOwnProps<ElementOf<T>>>
        as={local.as}
        ref={mergeRefs(local.ref, setElRef)}
        {...attrs()}
        {...others}
      >
        {local.children}
      </Polymorphic>
    </Show>
  );
}
