import { SliderContext } from "./SliderContext";
import SliderRail from "./SliderRail";
import SliderRoot from "./SliderRoot";
import SliderThumb from "./SliderThumb";
import SliderThumbs from "./SliderThumbs";
import SliderTrack from "./SliderTrack";

function Slider() {}

export default Object.assign(Slider, {
  Root: SliderRoot,
  Rail: SliderRail,
  Track: SliderTrack,
  Thumb: SliderThumb,
  Thumbs: SliderThumbs,
  Context: SliderContext,
});

export type {
  SliderContextValue,
  SliderThumbState,
  SliderValue
} from "./SliderContext";
export type { SliderRailProps } from "./SliderRail";
export type {
  SliderRootElementProps, SliderRootOwnProps, SliderRootProps
} from "./SliderRoot";
export type { SliderThumbOwnProps, SliderThumbProps } from "./SliderThumb";
export type { SliderThumbRenderState, SliderThumbsProps } from "./SliderThumbs";
export type { SliderTrackOwnProps, SliderTrackProps } from "./SliderTrack";
export {
  SliderContext, SliderRail, SliderRoot, SliderThumb,
  SliderThumbs,
  SliderTrack
};

