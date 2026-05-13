import type { JSX } from "solid-js";
import { render } from "solid-js/web";

export function mount(view: () => JSX.Element) {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const dispose = render(view, host);

  return { host, dispose };
}

export async function nextFrame() {
  await Promise.resolve();

  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 16);
  });

  await Promise.resolve();
}
