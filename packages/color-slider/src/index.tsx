import { ColorSliderContext } from "./ColorSliderContext";
import ColorSliderRail from "./ColorSliderRail";
import ColorSliderRoot from "./ColorSliderRoot";
import ColorSliderThumb from "./ColorSliderThumb";

function ColorSlider() {}

export default Object.assign(ColorSlider, {
  Root: ColorSliderRoot,
  Rail: ColorSliderRail,
  Thumb: ColorSliderThumb,
  Context: ColorSliderContext,
});

export {
  ColorSliderContext,
  ColorSliderRail,
  ColorSliderRoot,
  ColorSliderThumb,
};

export type { ColorSliderContextValue } from "./ColorSliderContext";
export type { ColorSliderRailProps } from "./ColorSliderRail";
export type {
  ColorSliderRootProps,
  ColorSliderRootOwnProps,
} from "./ColorSliderRoot";
export type {
  ColorSliderThumbOwnProps,
  ColorSliderThumbProps,
} from "./ColorSliderThumb";
export type { ColorSliderStrategy, ColorSliderType } from "./strategies";
