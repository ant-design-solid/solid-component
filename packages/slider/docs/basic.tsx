import Slider from "../src";
import "./index.css";

export default function BasicDemo() {
  return (
    <Slider.Root defaultValue={[20, 60]} class="slider">
      <Slider.Rail class="slider__rail">
        <Slider.Track class="slider__track" />
        <Slider.Thumbs>
          {(thumb) => (
            <Slider.Thumb class="slider__thumb" id={thumb.id}>
              {thumb.value()}
            </Slider.Thumb>
          )}
        </Slider.Thumbs>
      </Slider.Rail>
    </Slider.Root>
  );
}
