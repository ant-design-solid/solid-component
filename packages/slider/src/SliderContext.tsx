import { error } from "@solid-component/utils";
import { Accessor, createContext, useContext } from "solid-js";
import { SliderDirection } from "./utils/direction";

export type SliderValue = number | number[];

export interface SliderThumbState {
  id: string;
  value: Accessor<number>;
  percent: Accessor<number>;
  min: Accessor<number>;
  max: Accessor<number>;
}

export interface SliderContextValue<T extends SliderValue = SliderValue> {
  step: Accessor<number>;
  direction: Accessor<SliderDirection>;
  disabled: Accessor<boolean>;
  keyboard: Accessor<boolean>;
  values: Accessor<number[]>;
  thumbs: Accessor<SliderThumbState[]>;
  getValuePercent: (value: number) => number;
  isActive: (id: string) => boolean
  setActiveThumb: (id?: string) => void;
  setThumbValue: (id: string, nextValue: number) => number[] | null;
  beginSlide: (
    event: PointerEvent & { currentTarget: HTMLElement },
    id?: string,
  ) => void;
  setRailRef: (el: HTMLElement) => void;
}

export const SliderContext = createContext<SliderContextValue>();

export function useSliderContext() {
  const context = useContext(SliderContext);

  if (!context) {
    error(`Slider components must be used within <Slider.Root>.`, {
      package: "slider",
    });
  }

  return context;
}

export const SliderThumbContext = createContext<SliderThumbState>();

export function useSliderThumbContext() {
  const context = useContext(SliderThumbContext);
  return context;
}
