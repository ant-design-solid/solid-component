import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import FieldInput from "./FieldInput";
import FieldRoot from "./FieldRoot";

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("FieldInput", () => {
  describe("value sync", () => {
    it("reads value from FieldRoot context", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot defaultValue="from context">
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("from context");

      dispose();
    });

    it("updates when context value changes externally", async () => {
      const { host, dispose } = mount(() => {
        // This component has its own signal to test reactivity
        const [val, setVal] = createSignal("a");
        return (
          <>
            <FieldRoot value={val()}>
              <FieldInput />
            </FieldRoot>
            <button onClick={() => setVal("b")}>update</button>
          </>
        );
      });

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("a");

      host.querySelector("button")!.click();
      await Promise.resolve();
      expect(input.value).toBe("b");

      dispose();
    });

    it("calls onChange on FieldRoot when input value changes", () => {
      const onChange = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="" onChange={onChange}>
          <FieldInput />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;
      input.value = "typed";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      expect(onChange).toHaveBeenCalledWith("typed");

      dispose();
    });

  });

  describe("IME composition", () => {
    it("does not commit value during composition by default", () => {
      const onChange = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="" onChange={onChange}>
          <FieldInput />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;

      // Start IME composition
      input.dispatchEvent(new CompositionEvent("compositionstart"));

      // During composition, input events should not trigger onChange
      input.value = "candidate";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChange).not.toHaveBeenCalled();

      // End composition
      input.dispatchEvent(new CompositionEvent("compositionend"));

      // onChange should now be called with the composed value
      expect(onChange).toHaveBeenCalledWith("candidate");

      dispose();
    });

    it("commits value during composition when changeOnComposing is true", () => {
      const onChange = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="" onChange={onChange}>
          <FieldInput changeOnComposing />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;

      // Start IME composition
      input.dispatchEvent(new CompositionEvent("compositionstart"));

      // During composition with changeOnComposing, input events DO trigger onChange
      input.value = "partial";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChange).toHaveBeenCalledWith("partial");

      dispose();
    });

    it("calls onCompositionStart and onCompositionEnd callbacks", () => {
      const onCompositionStart = vi.fn();
      const onCompositionEnd = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="">
          <FieldInput
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
          />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;

      input.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(onCompositionStart).toHaveBeenCalledTimes(1);

      input.dispatchEvent(new CompositionEvent("compositionend"));
      expect(onCompositionEnd).toHaveBeenCalledTimes(1);

      dispose();
    });
  });

  describe("onPressEnter", () => {
    it("calls onPressEnter when Enter key is pressed", () => {
      const onPressEnter = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="">
          <FieldInput onPressEnter={onPressEnter} />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;

      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );

      expect(onPressEnter).toHaveBeenCalledTimes(1);

      dispose();
    });

    it("does not call onPressEnter for non-Enter keys", () => {
      const onPressEnter = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="">
          <FieldInput onPressEnter={onPressEnter} />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;

      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );

      expect(onPressEnter).not.toHaveBeenCalled();

      dispose();
    });

    it("does not call onPressEnter when composing", () => {
      const onPressEnter = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="">
          <FieldInput onPressEnter={onPressEnter} />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;

      // Start composition
      input.dispatchEvent(new CompositionEvent("compositionstart"));

      // Enter during composition should not trigger (isComposing must be true)
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }),
      );

      expect(onPressEnter).not.toHaveBeenCalled();

      dispose();
    });
  });

  describe("disabled / readonly", () => {
    it("sets disabled attribute from context", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot disabled>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.disabled).toBe(true);
      expect(input.getAttribute("aria-disabled")).toBe("true");

      dispose();
    });

    it("sets readonly attribute from context", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot readonly>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.readOnly).toBe(true);
      expect(input.getAttribute("aria-readonly")).toBe("true");

      dispose();
    });

    it("does not set disabled when context disabled is false", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot disabled={false}>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.disabled).toBe(false);
      expect(input.getAttribute("aria-disabled")).toBe("false");

      dispose();
    });

    it("does not set readonly when context readonly is false", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot readonly={false}>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.readOnly).toBe(false);
      expect(input.getAttribute("aria-readonly")).toBe("false");

      dispose();
    });
  });

});
