import type { MotionName, MotionStageName, MotionStatus, MotionStep } from './types'


/**
 * Trigger a reflow so the browser picks up the initial CSS class
 * before the active class is added on the next frame.
 */
export function forceReflow(el: HTMLElement): void {
  void el.offsetHeight
}

function getMotionStepKey(status: MotionStatus, step: Exclude<MotionStep, 'idle'>): keyof MotionStageName {
  const prefix = status as 'appear' | 'enter' | 'leave'
  switch (step) {
    case 'prepare':
      return `${prefix}Prepare`
    case 'start':
      return `${prefix}Start`
    case 'active':
      return `${prefix}Active`
    case 'end':
      return `${prefix}End`
  }
}

function resolveMotionBaseName(name: MotionName | undefined): string | undefined {
  if (!name) return undefined
  return typeof name === 'string' ? name : name.base
}

function resolveMotionPhaseName(name: MotionName | undefined, status: MotionStatus): string | undefined {
  if (!name) return undefined
  if (typeof name === 'string') return `${name}-${status}`
  return name[status]
}

function resolveMotionStepName(
  name: MotionName | undefined,
  status: MotionStatus,
  step: Exclude<MotionStep, 'idle'>,
): string | undefined {
  if (!name) return undefined
  const phase = resolveMotionPhaseName(name, status)
  if (typeof name === 'string') return `${phase}-${step}`
  const explicit = name[getMotionStepKey(status, step)]
  return explicit ?? (phase ? `${phase}-${step}` : undefined)
}

export function getMotionClassNames(
  name: MotionName | undefined,
  status: MotionStatus,
  step?: Exclude<MotionStep, 'idle'>,
) {
  const root = resolveMotionBaseName(name)
  const phase = resolveMotionPhaseName(name, status)
  const currentStep = step ? resolveMotionStepName(name, status, step) : undefined
  return {
    root,
    phase,
    step: currentStep,
  }
}

function getAllMotionClassNames(name: MotionName | undefined): string[] {
  const classes = new Set<string>()
  const root = resolveMotionBaseName(name)
  if (root) classes.add(root)

  for (const status of ['enter', 'appear', 'leave'] as MotionStatus[]) {
    const phase = resolveMotionPhaseName(name, status)
    if (phase) classes.add(phase)

    for (const step of ['prepare', 'start', 'active', 'end'] as const) {
      const stepClass = resolveMotionStepName(name, status, step)
      if (stepClass) classes.add(stepClass)
    }
  }

  return [...classes]
}

export function removeMotionClasses(el: HTMLElement, name: MotionName | undefined) {
  const classes = getAllMotionClassNames(name)
  if (classes.length > 0) {
    el.classList.remove(...classes)
  }
}
