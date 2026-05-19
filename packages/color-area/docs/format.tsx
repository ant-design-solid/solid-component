import { Color } from "@solid-component/utils";
import { createSignal } from "solid-js";
import ColorArea from "../src";

export default function FormatDemo() {
  const [color, setColor] = createSignal(new Color("#1677ff"));
  return (
    <div>
      <div>
        <h3>Controlled Color</h3>
        <div>hex: {color().format("hex")}</div>
        <div>rgb: {color().format("rgb")}</div>
        <div>hsv: {color().format("hsv")}</div>
        <ColorArea.Root
          value={color()}
          onChange={setColor}
          style={{
            position: "relative",
            "border-radius": "6px",
            height: "150px",
            width: "150px",
          }}
        >
          <ColorArea.Thumb
            style={{
              display: "block",
              width: "16px",
              height: "16px",
              "border-radius": "9999px",
              border: "2px solid #fff",
              background: "var(--color-current)",
            }}
          ></ColorArea.Thumb>
        </ColorArea.Root>
      </div>
    </div>
  );
}
