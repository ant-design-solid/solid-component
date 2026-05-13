import { vi } from "vitest";
import { nextFrame } from "./render";

type ResizeCallback = ResizeObserverCallback;

const resizeCallbacks = new Map<Element, Set<ResizeCallback>>();

class MockResizeObserver {
  private callback: ResizeCallback;
  private targets = new Set<Element>();

  constructor(callback: ResizeCallback) {
    this.callback = callback;
  }

  observe = (target: Element) => {
    this.targets.add(target);

    let callbacks = resizeCallbacks.get(target);
    if (!callbacks) {
      callbacks = new Set();
      resizeCallbacks.set(target, callbacks);
    }

    callbacks.add(this.callback);
  };

  unobserve = (target: Element) => {
    this.targets.delete(target);
    resizeCallbacks.get(target)?.delete(this.callback);
  };

  disconnect = () => {
    for (const target of this.targets) {
      resizeCallbacks.get(target)?.delete(this.callback);
    }
    this.targets.clear();
  };
}

export function installResizeObserverMock() {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

export function resetResizeObserverMock() {
  resizeCallbacks.clear();
}

export function setElementSize(element: HTMLElement, width: number, height = 20) {
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(element, "offsetWidth", {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    get: () => height,
  });
}

export function notifyResize(element: Element) {
  const callbacks = resizeCallbacks.get(element);
  if (!callbacks) {
    return;
  }

  const entry = { target: element } as ResizeObserverEntry;

  for (const callback of callbacks) {
    callback([entry], {} as ResizeObserver);
  }
}

export async function measureElement(
  element: HTMLElement,
  width: number,
  height?: number,
) {
  setElementSize(element, width, height);
  notifyResize(element);
  await nextFrame();
}
