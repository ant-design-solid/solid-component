import { MaybeElement } from "@s-primitives/shared";
import { createResizeObserver } from "@s-primitives/web";
import { createSignal } from "solid-js";

export interface OverflowRootProps {}

export default function OverflowRoot(props: OverflowRootProps) {
  const [rootRef, setRootRef] = createSignal<MaybeElement>();
  createResizeObserver(rootRef, () => {});

  return <div ref={setRootRef}>123</div>;
}
