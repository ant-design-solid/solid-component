import Floating from "../src";

export default function BasicDemo() {
  return (
    <div
      style={{
        position: "relative",
        height: "180px",
        padding: "32px",
        border: "1px solid #d8e1d4",
        "border-radius": "18px",
        background: "#f8fbf7",
      }}
    >
      <Floating.Root action="click" placement="bottom">
        <Floating.Trigger
          as="button"
          type="button"
          style={{
            padding: "10px 14px",
            border: "1px solid #2f7a4e",
            "border-radius": "999px",
            background: "#2f7a4e",
            color: "#fff",
            "font-weight": 700,
            cursor: "pointer",
          }}
        >
          Toggle popup
        </Floating.Trigger>

        <Floating.Portal>
          <Floating.Popup
            style={{
              width: "240px",
              padding: "14px",
              border: "1px solid #d8e1d4",
              "border-radius": "16px",
              background: "#ffffff",
              "box-shadow": "0 16px 36px rgba(21, 41, 26, 0.14)",
            }}
          >
            <strong style={{ display: "block", "margin-bottom": "6px" }}>Composable popup</strong>
            <span style={{ color: "#5f6d60", "line-height": 1.6 }}>
              Trigger, portal, popup and arrow are separate primitives so you can assemble a
              tooltip, popover or dropdown.
            </span>
            <Floating.Arrow>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  rotate: "45deg",
                  background: "#ffffff",
                  border: "1px solid #d8e1d4",
                }}
              />
            </Floating.Arrow>
          </Floating.Popup>
        </Floating.Portal>
      </Floating.Root>
    </div>
  );
}
