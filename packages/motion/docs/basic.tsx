import { createSignal } from "solid-js";
import Motion from "../src";

import "./index.css";

export default function BasicDemo() {
  const [visible, setVisible] = createSignal(true);

  return (
    <section class="docs-motion-demo">
      <div class="docs-motion-actions">
        <button
          class={`docs-motion-button ${visible() ? "docs-motion-button-primary" : "docs-motion-button-outline"}`}
          type="button"
          onClick={() => setVisible((current) => !current)}
        >
          {visible() ? "Hide panel" : "Show panel"}
        </button>
      </div>

      <div class="docs-group-list">
        <Motion
          as="div"
          visible={visible()}
          name="docs-fade"
          class="docs-group-tag docs-motion-panel"
        >
          Motion drives enter and leave phases while keeping the rendered element under your
          control.
        </Motion>
      </div>
    </section>
  );
}
