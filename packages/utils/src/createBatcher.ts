import { tryOnCleanup } from "@s-primitives/shared";
import { batch, createSignal, type Accessor } from "solid-js";

export type BatcherSchedule = "microtask" | "defer" | "animationFrame";
export type BatcherStrategy = "queue" | "latest";

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
      if (!canceled) {
        callback();
      }
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

interface PendingTask<TDiscard> {
  run: () => unknown | Promise<unknown>;
  resolve: (value: TDiscard) => void;
  reject: (error: unknown) => void;
}

export interface BatcherOptions<TDiscard = void> {
  /**
   * @default 'microtask'
   */
  schedule?: BatcherSchedule;
  /**
   * @default 'queue'
   */
  strategy?: BatcherStrategy;
  /**
   * 被覆盖或取消时返回的值。
   */
  discardValue?: TDiscard;
}

export interface Batcher<TDiscard = void> {
  isPending: Accessor<boolean>;
  submit<T>(task: () => T | Promise<T>): Promise<T | TDiscard>;
  flush(): Promise<void>;
  cancel(): void;
  stop(): void;
}

export function createBatcher<TDiscard = void>(
  options: BatcherOptions<TDiscard> = {},
): Batcher<TDiscard> {
  const { schedule = "microtask", strategy = "queue", discardValue } = options;

  let queuedTasks: PendingTask<TDiscard>[] = [];
  let latestTask: PendingTask<TDiscard> | null = null;
  let disposed = false;
  let currentDrain: Promise<void> | null = null;

  const [cancelFlush, setCancelFlush] = createSignal<VoidFunction>();
  const [isPending, setIsPending] = createSignal(false);

  const hasBufferedTasks = () => queuedTasks.length > 0 || latestTask !== null;

  const syncPendingState = () => {
    setIsPending(!!cancelFlush() || !!currentDrain || hasBufferedTasks());
  };

  const settleDiscard = (task: PendingTask<TDiscard>) => {
    task.resolve(discardValue as TDiscard);
  };

  const takeNextTasks = () => {
    if (strategy === "latest") {
      if (!latestTask) {
        return [];
      }

      const task = latestTask;
      latestTask = null;
      return [task];
    }

    if (!queuedTasks.length) {
      return [];
    }

    const tasks = queuedTasks;
    queuedTasks = [];
    return tasks;
  };

  const runTask = async (task: PendingTask<TDiscard>) => {
    try {
      // 同步任务里的 signal 更新合并到一个 batch 中，减少额外响应式开销。
      const result = batch(() => task.run());
      task.resolve((await result) as TDiscard);
    } catch (error) {
      task.reject(error);
    }
  };

  const scheduleFlush = () => {
    if (disposed || currentDrain || cancelFlush() || !hasBufferedTasks()) {
      syncPendingState();
      return;
    }

    const cancel = flushSchedule(schedule, () => {
      setCancelFlush(undefined);
      syncPendingState();
      void drain();
    });

    setCancelFlush(() => cancel);
    syncPendingState();
  };

  const drain = async () => {
    if (currentDrain) {
      return currentDrain;
    }

    currentDrain = (async () => {
      try {
        while (!disposed) {
          const tasks = takeNextTasks();
          if (!tasks.length) {
            break;
          }

          for (const task of tasks) {
            await runTask(task);
          }
        }
      } finally {
        currentDrain = null;
        if (!disposed && hasBufferedTasks()) {
          scheduleFlush();
        } else {
          syncPendingState();
        }
      }
    })();

    syncPendingState();
    return currentDrain;
  };

  const submit = <T>(task: () => T | Promise<T>) => {
    if (disposed) {
      return Promise.resolve(discardValue as TDiscard);
    }

    return new Promise<T | TDiscard>((resolve, reject) => {
      const pendingTask: PendingTask<TDiscard> = {
        run: task,
        resolve,
        reject,
      };

      if (strategy === "latest") {
        if (latestTask) {
          settleDiscard(latestTask);
        }
        latestTask = pendingTask;
      } else {
        queuedTasks.push(pendingTask);
      }

      syncPendingState();
      scheduleFlush();
    });
  };

  const flush = async () => {
    if (disposed) {
      return;
    }

    const cancel = cancelFlush();
    if (cancel) {
      cancel();
      setCancelFlush(undefined);
    }

    syncPendingState();
    await drain();
  };

  const cancel = () => {
    const scheduledCancel = cancelFlush();
    if (scheduledCancel) {
      scheduledCancel();
      setCancelFlush(undefined);
    }

    const tasks = queuedTasks;
    const latest = latestTask;
    queuedTasks = [];
    latestTask = null;

    tasks.forEach(settleDiscard);
    if (latest) {
      settleDiscard(latest);
    }

    syncPendingState();
  };

  const stop = () => {
    disposed = true;
    cancel();
  };

  tryOnCleanup(stop);

  return {
    isPending,
    submit,
    flush,
    cancel,
    stop,
  };
}
