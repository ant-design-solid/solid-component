import {
  ElementOf,
  Polymorphic,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { access, mergeRefs, mergeStyle } from "@solid-component/utils";
import { createSwitchMotion } from "@solid-primitive/web";
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
import { createMotionRunner, type MotionHandlers } from "./motionRunner";
import {
  MotionEndEvent,
  MotionName,
  type MotionPhase,
  type MotionStatus,
  type MotionStep,
} from "./types";

export interface MotionLifecycle {
  onAppearPrepare?: (el: HTMLElement) => void | Promise<void>;
  onAppearStart?: (el: HTMLElement) => void;
  onAppearActive?: (el: HTMLElement) => void;
  onAppearEnd?: (el: HTMLElement, event: MotionEndEvent) => boolean | void;

  onEnterPrepare?: (el: HTMLElement) => void | Promise<void>;
  onEnterStart?: (el: HTMLElement) => void;
  onEnterActive?: (el: HTMLElement) => void;
  onEnterEnd?: (el: HTMLElement, event: MotionEndEvent) => boolean | void;

  onLeavePrepare?: (el: HTMLElement) => void | Promise<void>;
  onLeaveStart?: (el: HTMLElement) => void;
  onLeaveActive?: (el: HTMLElement) => void;
  onLeaveEnd?: (el: HTMLElement, event: MotionEndEvent) => boolean | void;
}

export interface MotionOwnProps
  extends MotionLifecycle, Partial<Record<MotionStatus, boolean>> {
  visible?: boolean;
  name?: MotionName;
  removeOnLeave?: boolean;
  leavedClassName?: string;
  deadline?: number;
  forceRender?: boolean;
  onVisibleChanged?: (visible: boolean) => void;
  children?: JSX.Element;
}

export interface MotionCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  "ref" | "class" | "style"
> {}

export interface MotionProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends MotionOwnProps, MotionCommonProps<ElementOf<T>> {}

interface MotionState {
  phase: MotionPhase;
  step: MotionStep;
  hidden: boolean;
}

const idleState = (hidden: boolean): MotionState => ({
  phase: "none",
  step: "idle",
  hidden,
});

const defaults = {
  as: "div",
  appear: true,
  enter: true,
  leave: true,
  removeOnLeave: true,
} as const;
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

  const [elRef, setElRef] = createSignal<HTMLElement>();
  const [motionState, setMotionState] = createSignal<MotionState>(
    idleState(!initialVisible),
  );
  const [hasBeenVisible, setHasBeenVisible] = createSignal(initialVisible);

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
    setMotionState({ phase: "none", step: "end", hidden });
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

  const runner = createMotionRunner({
    element: elRef,
    name: () => local.name,
    deadline: () => local.deadline,
    onStep: (status, step, hidden) => {
      setStep(status, step, hidden);
    },
    onFinish: finishMotion,
  });

  onCleanup(runner.cleanup);

  const items = createSwitchMotion(
    () => (access(local.visible) ? ("visible" as const) : undefined),
    {
      mode: "out-in",
      appear: shouldAppear,
      onEnter(_el: "visible", done: () => void) {
        requestAnimationFrame(() => {
          const el = untrack(elRef);
          if (!el) {
            settle(false);
            done();
            return;
          }

          const status: MotionStatus =
            shouldAppear && !hasAppeared ? "appear" : "enter";
          hasAppeared = true;
          setHasBeenVisible(true);
          runner.runMotion(
            status,
            status === "appear" ? shouldAppear : local.enter,
            motionState().hidden,
            false,
            getMotionHandlers(status),
            () => {
              settle(false);
              done();
            },
          );
        });
      },
      onExit(_el: "visible" | undefined, done: () => void) {
        const el = untrack(elRef);
        if (!el) {
          settle(true);
          done();
          return;
        }

        runner.runMotion(
          "leave",
          local.leave,
          false,
          true,
          getMotionHandlers("leave"),
          () => {
            settle(true);
            done();
          },
        );
      },
    },
  );

  const shouldRender = createMemo(
    () =>
      local.forceRender ||
      items().length > 0 ||
      (!local.removeOnLeave && hasBeenVisible()),
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
      <Polymorphic<MotionOwnProps>
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
