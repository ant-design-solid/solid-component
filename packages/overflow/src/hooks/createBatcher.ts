import { tryOnCleanup } from "@s-components/utils";
import { batch, createMemo, createSignal, Setter } from "solid-js";

export type BatcherSchedule = "microtask" | "defer" | "animationFrame";

function fallbackFlush(callback: VoidFunction) {
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
}

function flushSchedule(mode: BatcherSchedule, callback: VoidFunction) {
  if (mode === "defer" && typeof MessageChannel !== "undefined") {
    const channel = new MessageChannel();

    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      callback();
    };
    channel.port2.postMessage(undefined);

    return () => {
      channel.port1.close();
      channel.port2.close();
    };
  }

  if (mode === "microtask") {
    let canceled = false;
    const schedule =
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (fn: VoidFunction) => Promise.resolve().then(fn);

    schedule(() => {
      canceled || callback();
    });

    return () => {
      canceled = true;
    };
  }

  if (typeof requestAnimationFrame !== "undefined") {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
  }

  return fallbackFlush(callback);
}

export interface BatcherOptions {
  /**
   * @default 'microtask'
   */
  schedule?: BatcherSchedule;
}

export function createBatcher(options: BatcherOptions = {}) {
  const { schedule = "microtask" } = options;
  let queue: VoidFunction[] = [];
  let disposed = false;

  const [cancelFlush, setCancelFlush] = createSignal<VoidFunction>();
  const isPending = createMemo(() => !!cancelFlush());

  function doFlush() {
    const cancel = flushSchedule(schedule, flush);
    setCancelFlush(() => cancel);
  }

  function enqueue(task: VoidFunction) {
    if (disposed) return;
    queue.push(task);
    if (!cancelFlush()) {
      doFlush();
    }
  }

  function flush() {
    setCancelFlush(undefined);
    if (disposed || !queue.length) {
      queue = [];
      return;
    }
    const tasks = queue;
    queue = [];

    batch(() => {
      for (const task of tasks) {
        task();
      }
    });
    if (queue.length && !cancelFlush()) {
      doFlush();
    }
  }

  function cancel() {
    queue = [];
    cancelFlush()?.();
    setCancelFlush(undefined);
  }

  function dispose() {
    disposed = true;
    cancel();
  }

  tryOnCleanup(dispose);

  return {
    isPending,

    enqueue,
    flush,
    cancel,
    stop: dispose,
  };
}

export type Batcher = ReturnType<typeof createBatcher>;
