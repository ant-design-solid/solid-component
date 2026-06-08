import type { Assign } from "@solid-primitive/utils";
import { type ComponentProps, type JSX, type ValidComponent, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

/* -------------------------------------------------------------------------------------------------
 * Polymorphic
 * -----------------------------------------------------------------------------------------------*/

export type ElementOf<T> = T extends HTMLElement
  ? T
  : T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : any;

/**
 * Polymorphic attribute.
 */
export interface PolymorphicAttributes<T extends ValidComponent> {
  as?: T | keyof JSX.HTMLElementTags;
}

/**
 * Props used by a polymorphic component.
 */
export type PolymorphicProps<T extends ValidComponent, Props extends {} = {}> = Assign<
  ComponentProps<T>, // Override props from custom/tag component with our own
  Props & // Accept custom props of our own component
    PolymorphicAttributes<T>
>;

/**
 * A utility component that render its `as` prop.
 */
export function Polymorphic<RenderProps>(
  props: RenderProps & PolymorphicAttributes<ValidComponent>,
): JSX.Element {
  const [local, others] = splitProps(props, ["as"]);

  if (!local.as) {
    throw new Error("[solid-components]: Polymorphic is missing the required `as` prop.");
  }

  return (
    // @ts-ignore: Props are valid but not worth calculating
    <Dynamic {...others} component={local.as} />
  );
}

export default Polymorphic;
