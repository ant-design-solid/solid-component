import type { JSX } from "solid-js";
import { MotionBaseProps } from "./types";

export interface MotionGroupOwnProps
  extends MotionBaseProps, JSX.HTMLAttributes<HTMLElement> {
  keys: (item: any) => string | number;
}

export type MotionGroupProps = MotionGroupOwnProps;

export default function MotionGroup(_props: MotionGroupProps): JSX.Element {
  throw new Error("[diagen]: MotionGroup is not yet implemented.");
}
