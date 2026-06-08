import { Accessor, createContext, useContext } from "solid-js";
import type { Color, TransformOffset } from "./utils";
import { error } from "@solid-component/utils";

export interface ColorAreaContextValue {
  color: Accessor<Color>;
  offset: Accessor<TransformOffset>;
}

export const ColorAreaContext = createContext<ColorAreaContextValue>();

export function useColorAreaContext() {
  const context = useContext(ColorAreaContext);

  if (!context) {
    error("ColorArea components must be used within <ColorArea.Root>.", {
      package: "color-area",
    });
  }

  return context;
}
