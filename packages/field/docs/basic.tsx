import { createSignal, Show } from "solid-js";
import Field from "../src";
import "./index.css";

export default function BasicDemo() {
  const [value, setValue] = createSignal("Hello");
  const [isTextArea, setIsTextArea] = createSignal(false);

  return (
    <>
      <button onClick={() => setIsTextArea((current) => !current)}>
        {isTextArea() ? "to input" : "to textarea"}
      </button>
      <Field.Root
        value={value()}
        onChange={setValue}
        class={`sc-field${isTextArea() ? " sc-field--textarea" : ""}`}
      >
        <Show
          when={isTextArea()}
          fallback={<Field.Input placeholder="Please input" class="sc-field__input" />}
        >
          {/* textarea 模式使用独立样式，避免复用单行输入的高度与对齐方式。 */}
          <Field.TextArea autoSize placeholder="Please input" class="sc-field__textarea" />
        </Show>

        <Field.Counter class="sc-field__counter" />
        <Field.Clear class="sc-field__clear" />
      </Field.Root>
      <div
        style={{
          color: "#8c8c8c",
          "font-size": "11px",
        }}
      >
        Current value: {value() || "empty"}
      </div>
    </>
  );
}
