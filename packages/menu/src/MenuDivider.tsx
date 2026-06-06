import Polymorphic, {
  type PolymorphicProps,
} from "@solid-component/polymorphic";
import { type ValidComponent } from "solid-js";

export interface MenuDividerProps<
  T extends ValidComponent | HTMLElement = HTMLLIElement,
> {}

export default function MenuDivider<T extends ValidComponent>(
  props: PolymorphicProps<T, MenuDividerProps<T>>,
) {
  return <Polymorphic as="li" role="separator" {...props} />;
}
