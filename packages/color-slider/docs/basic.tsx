import { Color } from "@solid-component/utils";
import { createSignal } from "solid-js";
import ColorSlider from "../src";
import "./index.css";

export default function BasicDemo() {
  const [color, setColor] = createSignal(new Color("#1677ff"));

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        width: "280px",
      }}
    >
      <ColorSlider.Root
        value={color()}
        onChange={setColor}
        type="hue"
        class="color-slider"
      >
        <ColorSlider.Rail class="color-slider__rail">
          <ColorSlider.Thumb class="color-slider__thumb" />
        </ColorSlider.Rail>
      </ColorSlider.Root>

      <ColorSlider.Root
        value={color()}
        onChange={setColor}
        type="alpha"
        class="color-slider"
      >
        <ColorSlider.Rail class="color-slider__rail">
          <ColorSlider.Thumb class="color-slider__thumb" />
        </ColorSlider.Rail>
      </ColorSlider.Root>

      <ColorSlider.Root
        value={color()}
        onChange={setColor}
        type="value"
        class="color-slider"
      >
        <ColorSlider.Rail class="color-slider__rail">
          <ColorSlider.Thumb class="color-slider__thumb" />
        </ColorSlider.Rail>
      </ColorSlider.Root>

      <div
        style={{
          height: "40px",
          "border-radius": "10px",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          background: color().format("rgb"),
        }}
      />
    </div>
  );
}
