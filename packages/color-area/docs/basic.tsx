import ColorArea from "../src";

export default function BasicDemo() {
  return (
    <div>
      <ColorArea.Root
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
  );
}
