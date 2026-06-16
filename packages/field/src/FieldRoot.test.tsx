import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import FieldCounter from "./FieldCounter";
import FieldInput from "./FieldInput";
import FieldRoot from "./FieldRoot";

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("FieldRoot", () => {
  describe("value management", () => {
    it("provides defaultValue through context", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot defaultValue="hello">
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("hello");

      dispose();
    });

    it("supports controlled value from signal", async () => {
      const [value, setValue] = createSignal("initial");
      const { host, dispose } = mount(() => (
        <FieldRoot value={value()}>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("initial");

      setValue("updated");
      await Promise.resolve();
      expect(input.value).toBe("updated");

      dispose();
    });

    it("calls onChange when FieldInput changes value", () => {
      const onChange = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot value="" onChange={onChange}>
          <FieldInput />
        </FieldRoot>
      ));

      const input = host.querySelector("input") as HTMLInputElement;
      input.value = "new";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      expect(onChange).toHaveBeenCalledWith("new");

      dispose();
    });
  });

  describe("disabled / readonly", () => {
    it("sets disabled on FieldInput when disabled is true", async () => {
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

    it("sets readonly on FieldInput when readonly is true", async () => {
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

    it("reactively updates FieldInput when disabled changes", async () => {
      const [disabled, setDisabled] = createSignal(false);
      const { host, dispose } = mount(() => (
        <FieldRoot disabled={disabled()}>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const input = host.querySelector("input") as HTMLInputElement;
      expect(input.disabled).toBe(false);

      setDisabled(true);
      await Promise.resolve();
      expect(input.disabled).toBe(true);

      dispose();
    });
  });

  describe("counter", () => {
    it("passes maxlength as counter max when no counter provided", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot maxlength={10} value="hi">
          <FieldCounter />
        </FieldRoot>
      ));

      await Promise.resolve();
      expect(host.textContent).toContain("2");
      expect(host.textContent).toContain("10");

      dispose();
    });

    it("uses custom strategy from counter prop", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot
          defaultValue="hello"
          counter={{ strategy: (v) => v.length * 2 }}
        >
          <FieldCounter />
        </FieldRoot>
      ));

      await Promise.resolve();
      // "hello".length * 2 = 10
      expect(host.textContent).toContain("10");

      dispose();
    });

    it("counter max overrides maxlength when both provided", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot
          maxlength={100}
          counter={{ max: 50 }}
          value="hello"
        >
          <FieldCounter />
        </FieldRoot>
      ));

      await Promise.resolve();
      expect(host.textContent).toContain("50");

      dispose();
    });

    it("uses default strategy (value.length) when not specified", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot value="12345">
          <FieldCounter />
        </FieldRoot>
      ));

      await Promise.resolve();
      expect(host.textContent).toContain("5");

      dispose();
    });
  });

  describe("expose", () => {
    it("calls expose with focus, blur, setSelectionRange, select", () => {
      const expose = vi.fn();
      const { host, dispose } = mount(() => (
        <FieldRoot expose={expose}>
          <FieldInput />
        </FieldRoot>
      ));

      expect(expose).toHaveBeenCalledTimes(1);
      const obj = expose.mock.calls[0][0];
      expect(obj).toHaveProperty("focus");
      expect(obj).toHaveProperty("blur");
      expect(obj).toHaveProperty("setSelectionRange");
      expect(obj).toHaveProperty("select");

      dispose();
    });
  });

  describe("click to focus", () => {
    it("focuses the input when root area is clicked", async () => {
      const { host, dispose } = mount(() => (
        <FieldRoot>
          <FieldInput />
        </FieldRoot>
      ));

      await Promise.resolve();
      const root = host.firstElementChild as HTMLElement;
      const input = host.querySelector("input") as HTMLInputElement;

      // Focus the input first to ensure it can receive focus
      input.focus();
      // Blur it
      input.blur();

      const focusSpy = vi.spyOn(input, "focus");
      root.click();

      expect(focusSpy).toHaveBeenCalled();

      dispose();
    });
  });
});
