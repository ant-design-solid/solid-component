import type {
  MotionLifecycle,
  MotionName,
  MotionStageName,
  MotionStatus,
  MotionStep,
} from "./types";

/**
 * Trigger a reflow so the browser picks up the initial CSS class
 * before the active class is added on the next frame.
 */
export function forceReflow(el: HTMLElement): void {
  void el.offsetHeight;
}

function getMotionStepKey(
  status: MotionStatus,
  step: MotionStep,
): keyof MotionStageName {
  const prefix = status as "appear" | "enter" | "leave";
  switch (step) {
    case "prepare":
      return `${prefix}Prepare`;
    case "start":
      return `${prefix}Start`;
    case "active":
      return `${prefix}Active`;
    case "end":
      return `${prefix}End`;
  }
}

function resolveMotionBaseName(
  name: MotionName | undefined,
): string | undefined {
  if (!name) return undefined;
  return typeof name === "string" ? name : name.base;
}

export function resolveMotionPhaseName(
  name: MotionName | undefined,
  status: MotionStatus | "move",
): string | undefined {
  if (!name) return undefined;
  if (typeof name === "string") return `${name}-${status}`;
  return name[status] ?? (name.base ? `${name.base}-${status}` : undefined);
}

function resolveMotionStepName(
  name: MotionName | undefined,
  status: MotionStatus,
  step: MotionStep,
): string | undefined {
  if (!name) return undefined;
  const phase = resolveMotionPhaseName(name, status);
  if (typeof name === "string") return `${phase}-${step}`;
  const explicit = name[getMotionStepKey(status, step)];
  return explicit ?? (phase ? `${phase}-${step}` : undefined);
}

export function getMotionClassNames(
  name: MotionName | undefined,
  status: MotionStatus,
  step?: MotionStep,
) {
  const root = resolveMotionBaseName(name);
  const phase = resolveMotionPhaseName(name, status);
  const currentStep = step
    ? resolveMotionStepName(name, status, step)
    : undefined;
  return {
    root,
    phase,
    step: currentStep,
  };
}

export function genHandlers(props: MotionLifecycle) {
  return {
    get appear() {
      return {
        prepare: props.onAppearPrepare,
        start: props.onAppearStart,
        active: props.onAppearActive,
        end: props.onAppearEnd,
      };
    },
    get enter() {
      return {
        prepare: props.onEnterPrepare,
        start: props.onEnterStart,
        active: props.onEnterActive,
        end: props.onEnterEnd,
      };
    },
    get leave() {
      return {
        prepare: props.onLeavePrepare,
        start: props.onLeaveStart,
        active: props.onLeaveActive,
        end: props.onLeaveEnd,
      };
    },
  } as const;
}
