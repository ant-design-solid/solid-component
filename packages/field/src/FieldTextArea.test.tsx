import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import { notifyResize } from "../../.test/resize-observer";
import FieldRoot from "./FieldRoot";
import FieldTextArea from "./FieldTextArea";

const { measureTextAreaHeightMock } = vi.hoisted(() => ({
  measureTextAreaHeightMock: vi.fn(),
}));

vi.mock("./utils/measureTextAreaHeight", () => ({
  default: measureTextAreaHeightMock,
}));

function createMeasurement(height: number) {
  return {
    height,
    minHeight: undefined,
    maxHeight: undefined,
    overflowY: "hidden" as const,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  measureTextAreaHeightMock.mockReset();
  vi.restoreAllMocks();
});

describe("FieldTextArea", () => {
  it("resizes synchronously when the textarea value changes", () => {
    measureTextAreaHeightMock.mockImplementation((el: HTMLTextAreaElement) =>
      createMeasurement(20 + el.value.length),
    );

    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.style.height).toBe("20px");

    measureTextAreaHeightMock.mockClear();

    textarea.value = "sync";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    expect(measureTextAreaHeightMock).toHaveBeenCalledTimes(1);
    expect(textarea.style.height).toBe("24px");

    dispose();
  });

  it("ignores the resize observer cycle triggered by its own autosize update", async () => {
    measureTextAreaHeightMock.mockReturnValue(createMeasurement(32));
    const onResize = vi.fn();

    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize onResize={onResize} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;

    await Promise.resolve();

    expect(measureTextAreaHeightMock).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);

    notifyResize(textarea);
    await nextFrame();

    expect(measureTextAreaHeightMock).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);

    dispose();
  });

  it("cancels a queued observer resize when autosize is turned off", async () => {
    measureTextAreaHeightMock.mockReturnValue(createMeasurement(40));

    const [autoSize, setAutoSize] = createSignal(true);
    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize={autoSize()} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;

    await Promise.resolve();

    notifyResize(textarea);
    notifyResize(textarea);
    setAutoSize(false);

    await nextFrame();

    expect(measureTextAreaHeightMock).toHaveBeenCalledTimes(1);
    expect(textarea.style.height).toBe("");
    expect(textarea.style.minHeight).toBe("");
    expect(textarea.style.maxHeight).toBe("");
    expect(textarea.style.overflowY).toBe("");

    dispose();
  });

  it("clears overflowY when autosize stops using maxRows", async () => {
    const [autoSize, setAutoSize] = createSignal<
      boolean | { minRows?: number; maxRows?: number }
    >({ maxRows: 1 });

    measureTextAreaHeightMock
      .mockReturnValueOnce({
        ...createMeasurement(20),
        maxHeight: 20,
        overflowY: "auto",
      })
      .mockReturnValueOnce({
        ...createMeasurement(24),
        overflowY: undefined,
      });

    const { host, dispose } = mount(() => (
      <FieldRoot>
        <FieldTextArea autoSize={autoSize()} />
      </FieldRoot>
    ));

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;

    await Promise.resolve();
    expect(textarea.style.overflowY).toBe("auto");

    setAutoSize(true);
    await Promise.resolve();

    expect(textarea.style.overflowY).toBe("");

    dispose();
  });
});
