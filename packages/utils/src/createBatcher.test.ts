import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";

import { createBatcher } from "./createBatcher";

const withRoot = async <T>(run: () => Promise<T> | T) =>
  new Promise<T>((resolve, reject) => {
    createRoot((dispose) => {
      try {
        Promise.resolve(run()).then(
          (value) => {
            dispose();
            resolve(value);
          },
          (error) => {
            dispose();
            reject(error);
          },
        );
      } catch (error) {
        dispose();
        reject(error);
      }
    });
  });

describe("createBatcher", () => {
  it("executes queued tasks in submit order", async () => {
    await withRoot(async () => {
      const order: number[] = [];
      const batcher = createBatcher();

      const first = batcher.submit(() => {
        order.push(1);
        return "first";
      });
      const second = batcher.submit(() => {
        order.push(2);
        return "second";
      });

      await expect(first).resolves.toBe("first");
      await expect(second).resolves.toBe("second");
      expect(order).toEqual([1, 2]);
      expect(batcher.isPending()).toBe(false);
    });
  });

  it("keeps only the latest task in latest strategy", async () => {
    await withRoot(async () => {
      const order: string[] = [];
      const batcher = createBatcher<"superseded">({
        strategy: "latest",
        discardValue: "superseded",
      });

      const first = batcher.submit(() => {
        order.push("first");
        return "first";
      });
      const second = batcher.submit(() => {
        order.push("second");
        return "second";
      });

      await expect(first).resolves.toBe("superseded");
      await expect(second).resolves.toBe("second");
      expect(order).toEqual(["second"]);
      expect(batcher.isPending()).toBe(false);
    });
  });

  it("settles pending tasks with discardValue when canceled", async () => {
    await withRoot(async () => {
      const batcher = createBatcher<"canceled">({
        discardValue: "canceled",
      });

      const task = batcher.submit(() => "done");
      batcher.cancel();

      await expect(task).resolves.toBe("canceled");
      expect(batcher.isPending()).toBe(false);
    });
  });
});
