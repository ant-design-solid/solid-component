import { Accessor, createContext, useContext } from "solid-js";
import type { Color } from "@solid-component/utils";
import type {
  ColorSliderStrategy,
  ColorSliderType,
} from "./strategies";

export interface ColorSliderContextValue {
  color: Accessor<Color>;
  type: Accessor<ColorSliderType>;
  strategy: Accessor<ColorSliderStrategy>;
}

export const ColorSliderContext = createContext<ColorSliderContextValue>();

export function useColorSliderContext() {
  const context = useContext(ColorSliderContext);

  if (!context) {
    throw new Error(
      "[solid-component]: ColorSlider components must be used within <ColorSlider.Root>.",
    );
  }

  return context;
}
