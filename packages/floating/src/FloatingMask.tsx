import { Motion } from "@solid-component/motion";
import { splitProps, JSX, ValidComponent } from "solid-js";
import type { FloatingMotionConfig } from "./FloatingContext";
import { useFloatingContext } from "./FloatingContext";
import Polymorphic, { PolymorphicProps } from "@solid-component/polymorphic";

export interface FloatingMaskProps extends JSX.HTMLAttributes<HTMLElement> {
  motion?: FloatingMotionConfig;
}

export default function FloatingMask<T extends ValidComponent>(
  props: PolymorphicProps<T, FloatingMaskProps>,
) {
  const { open } = useFloatingContext();
  const [local, rest] = splitProps(props, ["motion"]);

  return (
    <Motion visible={open()} {...local.motion}>
      <Polymorphic as="div" {...rest} />
    </Motion>
  );
}
