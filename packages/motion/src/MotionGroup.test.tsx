import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, nextFrame } from "../../.test/render";
import MotionGroup from "./MotionGroup";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

type Item = {
  id: number;
  label: string;
};

describe("MotionGroup", () => {
  it("新增项时触发 enter 生命周期", async () => {
    const onEnterStart = vi.fn();
    const [items, setItems] = createSignal<Item[]>([]);

    const { dispose } = mount(() => (
      <MotionGroup each={items()} by="id" onEnterStart={onEnterStart}>
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    setItems([{ id: 1, label: "A" }]);
    await nextFrame();

    expect(onEnterStart).toHaveBeenCalledTimes(1);

    dispose();
  });

  it("删除项时会等 leave 结束后再移除节点", async () => {
    const [items, setItems] = createSignal<Item[]>([
      { id: 1, label: "A" },
      { id: 2, label: "B" },
    ]);
    const onLeaveStart = vi.fn();
    const onLeaveEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <MotionGroup
        each={items()}
        by="id"
        name="fade"
        onLeaveStart={onLeaveStart}
        onLeaveEnd={onLeaveEnd}
      >
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    await nextFrame();

    setItems([{ id: 2, label: "B" }]);
    await nextFrame();

    const container = host.firstElementChild as HTMLElement;
    expect(container.textContent).toBe("AB");

    const leavingNode = container.firstElementChild as HTMLElement;
    leavingNode.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();

    expect(onLeaveStart).toHaveBeenCalledTimes(1);
    expect(onLeaveEnd).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("B");

    dispose();
  });

  it("MotionGroup.Item 会自动把 DOM 绑定给当前列表项", async () => {
    const refs: HTMLElement[] = [];

    const { dispose } = mount(() => (
      <MotionGroup each={[{ id: 1, label: "A" }]} by="id">
        {(item) => (
          <MotionGroup.Item
            as="div"
            ref={(el: HTMLDivElement) => {
              refs.push(el);
            }}
          >
            {item.label}
          </MotionGroup.Item>
        )}
      </MotionGroup>
    ));

    await nextFrame();

    expect(refs).toHaveLength(1);
    expect(refs[0].textContent).toBe("A");

    dispose();
  });

  it("未传 by 时 primitive 列表可按值工作", async () => {
    const [items, setItems] = createSignal(["A"]);
    const onLeaveStart = vi.fn();
    const onLeaveEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <MotionGroup each={items()} onLeaveStart={onLeaveStart} onLeaveEnd={onLeaveEnd} name="fade">
        {(item) => <MotionGroup.Item as="div">{item}</MotionGroup.Item>}
      </MotionGroup>
    ));

    await nextFrame();

    setItems([]);
    await nextFrame();

    expect(onLeaveStart).toHaveBeenCalledTimes(1);
    const container = host.firstElementChild as HTMLElement;
    expect(container.textContent).toBe("A");

    (container.firstElementChild as HTMLElement).dispatchEvent(
      new Event("transitionend", { bubbles: true }),
    );
    await Promise.resolve();

    expect(onLeaveEnd).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("");

    dispose();
  });

  it("快速新增后移除时不会被延迟 enter 再次显示", async () => {
    const [items, setItems] = createSignal<Item[]>([]);

    const { host, dispose } = mount(() => (
      <MotionGroup each={items()} by="id">
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    setItems([{ id: 1, label: "A" }]);
    setItems([]);
    await Promise.resolve();
    await nextFrame();

    const container = host.firstElementChild as HTMLElement;
    expect(container.textContent).toBe("");

    dispose();
  });

  it("重复 key 时给出开发警告", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { dispose } = mount(() => (
      <MotionGroup
        each={[
          { id: 1, label: "A" },
          { id: 1, label: "B" },
        ]}
        by="id"
      >
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    await nextFrame();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('MotionGroup detected a duplicate key "1".'),
    );

    dispose();
  });

  it("key 解析为 undefined 时给出开发警告", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { dispose } = mount(() => (
      <MotionGroup each={[{ id: undefined as unknown as number, label: "A" }]} by="id">
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    await nextFrame();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("resolved to an undefined key"));

    dispose();
  });

  it("by 为函数时可稳定复用列表项状态", async () => {
    const onEnterStart = vi.fn();
    const [items, setItems] = createSignal<Item[]>([{ id: 1, label: "A" }]);

    const { dispose } = mount(() => (
      <MotionGroup each={items()} by={(item) => item.id} onEnterStart={onEnterStart}>
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    await nextFrame();

    setItems([{ id: 1, label: "A2" }]);
    await nextFrame();

    expect(onEnterStart).toHaveBeenCalledTimes(0);

    dispose();
  });

  it("appear 为 false 时初始渲染不会触发 appear 生命周期", async () => {
    const onAppearStart = vi.fn();

    const { dispose } = mount(() => (
      <MotionGroup
        each={[{ id: 1, label: "A" }]}
        by="id"
        appear={false}
        onAppearStart={onAppearStart}
      >
        {(item) => <MotionGroup.Item as="div">{item.label}</MotionGroup.Item>}
      </MotionGroup>
    ));

    await nextFrame();

    expect(onAppearStart).toHaveBeenCalledTimes(0);

    dispose();
  });
});
