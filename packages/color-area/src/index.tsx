import { ColorAreaContext } from "./ColorAreaContext";
import ColorAreaRoot from "./ColorAreaRoot";
import ColorAreaThumb from "./ColorAreaThumb";

function ColorArea() {}

export default Object.assign(ColorArea, {
  Root: ColorAreaRoot,
  Thumb: ColorAreaThumb,
  Context: ColorAreaContext,
});
