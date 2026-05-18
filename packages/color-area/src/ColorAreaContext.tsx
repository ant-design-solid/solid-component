import { Accessor, createContext, useContext } from "solid-js";
import type { Color, TransformOffset } from "./utils";

export interface ColorAreaContextValue {
  color: Accessor<Color>;
  offset: Accessor<TransformOffset>;
}

export const ColorAreaContext = createContext<ColorAreaContextValue>();

export function useColorAreaContext() {
  const context = useContext(ColorAreaContext);

  if (!context) {
    throw new Error("[diagen]: ColorArea components must be used within <ColorArea.Root>.");
  }

  return context;
}
