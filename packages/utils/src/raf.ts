import { isServer } from "solid-js/web";
let raf = (callback: FrameRequestCallback) => setTimeout(callback, 16);
let caf = (num: number) => clearTimeout(num);

if (!isServer && "requestAnimationFrame" in window) {
  raf = (callback: FrameRequestCallback) =>
    window.requestAnimationFrame(callback);
  caf = (handle: number) => window.cancelAnimationFrame(handle);
}

export function makeRaf() {
  let frameId: number | undefined;

  const cancelRaf = () => {
    if (frameId != null) {
      caf(frameId);
    }
  };
  const callRaf = (callback: VoidFunction) => {
    cancelRaf();
    frameId = raf(() => {
      frameId = undefined;
      callback();
    });
  };

  return [callRaf, cancelRaf] as const;
}
