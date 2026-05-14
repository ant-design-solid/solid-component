import { createSignal } from "solid-js";

import Motion from "../src";

export default function BasicDemo() {
  const [visible, setVisible] = createSignal(true);

  return (
    <section
      style={{
        display: "grid",
        gap: "16px",
        padding: "20px",
        border: "1px solid #d8e1d4",
        "border-radius": "18px",
        background: "#f8fbf7",
      }}
    >
      <style>{`
        .docs-fade {
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .docs-fade-appear,
        .docs-fade-enter,
        .docs-fade-leave {
          opacity: 1;
          transform: translateY(0);
        }

        .docs-fade-appear-start,
        .docs-fade-enter-start,
        .docs-fade-leave-active {
          opacity: 0;
          transform: translateY(12px);
        }

        .docs-fade-appear-active,
        .docs-fade-enter-active,
        .docs-fade-leave-start {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        style={{
          width: "fit-content",
          padding: "10px 14px",
          border: "1px solid #2f7a4e",
          "border-radius": "999px",
          background: visible() ? "#2f7a4e" : "#ffffff",
          color: visible() ? "#ffffff" : "#2f7a4e",
          "font-weight": 700,
          cursor: "pointer",
        }}
      >
        {visible() ? "Hide panel" : "Show panel"}
      </button>

      <Motion
        as="div"
        visible={visible()}
        name="docs-fade"
        style={{
          padding: "18px",
          border: "1px solid #d8e1d4",
          "border-radius": "16px",
          background: "#ffffff",
        }}
      >
        Motion drives enter and leave phases while keeping the rendered element under your control.
      </Motion>
    </section>
  );
}
