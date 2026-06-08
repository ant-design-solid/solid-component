import {
  ElementOf,
  Polymorphic,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { access } from "@solid-primitive/utils";
import { mergeRefs, mergeStyle } from "@solid-component/utils";
import { createSwitchMotion } from "@solid-primitive/motion";
import { makeRaf } from "@solid-primitive/scheduler";
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
  onVisibleChangeEnd?: (visible: boolean) => void;
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
  hidden: boolean;
}

const idleState = (hidden: boolean): MotionState => ({
  phase: "none",
  hidden,
});

const defaults = {
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
    "onVisibleChangeEnd",

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

  const shouldAppear = !!local.visible && local.appear;
  let hasAppeared = !shouldAppear;

  const [elRef, setElRef] = createSignal<HTMLElement>();
  const [motionState, setMotionState] = createSignal<MotionState>(
    idleState(!local.visible),
  );
  const [hasBeenVisible, setHasBeenVisible] = createSignal(local.visible);

  const isMoving = createMemo(() => motionState().phase !== "none");
  const isLeaved = createMemo(() => !isMoving() && motionState().hidden);

  const setIdle = (hidden: boolean, notifyVisibleChanged = false) => {
    setMotionState(idleState(hidden));
    if (notifyVisibleChanged) {
      local.onVisibleChangeEnd?.(!hidden);
    }
  };

  const motionHandlersMap: Record<MotionStatus, () => MotionHandlers> = {
    appear: () => ({
      prepare: local.onAppearPrepare,
      start: local.onAppearStart,
      active: local.onAppearActive,
      end: local.onAppearEnd,
    }),
    enter: () => ({
      prepare: local.onEnterPrepare,
      start: local.onEnterStart,
      active: local.onEnterActive,
      end: local.onEnterEnd,
    }),
    leave: () => ({
      prepare: local.onLeavePrepare,
      start: local.onLeaveStart,
      active: local.onLeaveActive,
      end: local.onLeaveEnd,
    }),
  };

  const runner = createMotionRunner(elRef, () => local.name, {
    deadline: () => local.deadline,
    onStep: (status, _step, hidden) => {
      setMotionState({ phase: status, hidden });
    },
    onFinish: (hidden) => {
      setIdle(hidden);
    },
  });

  const [raf, cancelEnterFrame] = makeRaf();

  onCleanup(cancelEnterFrame);

  const startTransition = (
    status: MotionStatus,
    enabled: boolean,
    hiddenDuringMotion: boolean,
    hiddenAfterDone: boolean,
    done: () => void,
  ) => {
    const el = untrack(elRef);
    if (!el) {
      setIdle(hiddenAfterDone, true);
      done();
      return;
    }

    runner.start(
      status,
      enabled,
      hiddenDuringMotion,
      hiddenAfterDone,
      motionHandlersMap[status](),
      () => {
        setIdle(hiddenAfterDone, true);
        done();
      },
    );
  };

  const items = createSwitchMotion(
    () => (access(local.visible) ? ("visible" as const) : undefined),
    {
      mode: "out-in",
      appear: shouldAppear,
      onEnter(_el: "visible", done: () => void) {
        raf(() => {
          const status: MotionStatus =
            shouldAppear && !hasAppeared ? "appear" : "enter";
          hasAppeared = true;
          setHasBeenVisible(true);
          startTransition(
            status,
            status === "appear" ? shouldAppear : local.enter,
            motionState().hidden,
            false,
            done,
          );
        });
      },
      onExit(_el: "visible" | undefined, done: () => void) {
        cancelEnterFrame();
        startTransition("leave", local.leave, false, true, done);
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
        as="div"
        ref={mergeRefs(local.ref, setElRef)}
        {...attrs()}
        {...others}
      >
        {local.children}
      </Polymorphic>
    </Show>
  );
}
