import { For, JSX } from "solid-js";
import {
  SliderThumbContext,
  SliderThumbState,
  useSliderContext,
} from "./SliderContext";
import SliderThumb from "./SliderThumb";

export interface SliderThumbRenderState extends SliderThumbState {}

export interface SliderThumbsProps {
  children?: (thumb: SliderThumbRenderState) => JSX.Element;
}

export default function SliderThumbs(props: SliderThumbsProps) {
  const context = useSliderContext();

  return (
    <For each={context.thumbs()}>
      {(thumb) => (
        <SliderThumbContext.Provider value={thumb}>
          {props.children ? props.children(thumb) : <SliderThumb />}
        </SliderThumbContext.Provider>
      )}
    </For>
  );
}
