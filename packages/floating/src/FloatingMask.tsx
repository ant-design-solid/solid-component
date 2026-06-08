import { Motion } from "@solid-component/motion";
import { splitProps, JSX } from "solid-js";
import type { FloatingMotionConfig } from "./FloatingContext";
import { useFloatingContext } from "./FloatingContext";

export interface FloatingMaskProps extends JSX.HTMLAttributes<HTMLElement> {
  motion?: FloatingMotionConfig;
}

export default function FloatingMask(props: FloatingMaskProps) {
  const { open } = useFloatingContext();
  const [local, rest] = splitProps(props, ["motion"]);

  return <Motion visible={open()} {...local.motion} {...rest} />;
}
