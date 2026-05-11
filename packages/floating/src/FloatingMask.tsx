import { Motion } from "@s-components/motion";
import { splitProps } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { FloatingMotionConfig } from "./FloatingContext";
import { useFloatingContext } from "./FloatingContext";

export interface FloatingMaskProps extends JSX.HTMLAttributes<HTMLElement> {
  motion?: FloatingMotionConfig;
}

export default function FloatingMask(props: FloatingMaskProps) {
  const context = useFloatingContext();
  const [local, rest] = splitProps(props, ["motion"]);

  return <Motion visible={context.open()} {...local.motion} {...rest} />;
}
