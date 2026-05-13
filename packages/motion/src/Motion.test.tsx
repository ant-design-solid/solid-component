import { createSignal, type Accessor, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount, nextFrame } from "../../.test/render";
import Motion from "./Motion";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const mountWithVisible = (
  view: (visible: Accessor<boolean>) => JSX.Element,
  initialVisible = false,
) => {
  const [visible, setVisible] = createSignal(initialVisible);
  const mounted = mount(() => view(visible));
  return { ...mounted, setVisible };
};

const getNode = <T extends HTMLElement = HTMLElement>(
  host: HTMLElement,
  index = 0,
) => host.children[index] as T;

describe("Motion", () => {
  it("初始可见且无动效时不触发 enter 生命周期", async () => {
    const onEnterPrepare = vi.fn();
    const onEnterStart = vi.fn();
    const onEnterActive = vi.fn();
    const onEnterEnd = vi.fn();

    const { host, dispose } = mount(() => (
      <Motion
        visible
        onEnterPrepare={onEnterPrepare}
        onEnterStart={onEnterStart}
        onEnterActive={onEnterActive}
        onEnterEnd={onEnterEnd}
      >
        content
      </Motion>
    ));

    await nextFrame();

    expect(onEnterPrepare).not.toHaveBeenCalled();
    expect(onEnterStart).not.toHaveBeenCalled();
    expect(onEnterActive).not.toHaveBeenCalled();
    expect(onEnterEnd).not.toHaveBeenCalled();
    expect(host.firstElementChild?.className).toBe("");

    dispose();
  });

  it("缺少 name 和 deadline 时立即完成 leave", async () => {
    const onLeavePrepare = vi.fn();
    const onLeaveStart = vi.fn();
    const onLeaveActive = vi.fn();
    const onLeaveEnd = vi.fn();
    const onVisibleChanged = vi.fn();

    const { host, dispose, setVisible } = mountWithVisible(
      (visible) => (
        <Motion
          visible={visible()}
          onLeavePrepare={onLeavePrepare}
          onLeaveStart={onLeaveStart}
          onLeaveActive={onLeaveActive}
          onLeaveEnd={onLeaveEnd}
          onVisibleChanged={onVisibleChanged}
        >
          content
        </Motion>
      ),
      true,
    );

    await nextFrame();

    setVisible(false);
    await nextFrame();

    expect(onLeavePrepare).toHaveBeenCalledTimes(1);
    expect(onLeaveStart).toHaveBeenCalledTimes(1);
    expect(onLeaveActive).toHaveBeenCalledTimes(1);
    expect(onLeaveEnd).toHaveBeenCalledTimes(1);
    expect(onVisibleChanged).toHaveBeenLastCalledWith(false);
    expect(host.firstElementChild).toBeNull();

    dispose();
  });

  it("初始挂载触发 appear，后续再次显示触发 enter", async () => {
    const onAppearPrepare = vi.fn();
    const onAppearStart = vi.fn();
    const onAppearActive = vi.fn();
    const onAppearEnd = vi.fn();
    const onEnterPrepare = vi.fn();
    const onEnterStart = vi.fn();
    const onEnterActive = vi.fn();
    const onEnterEnd = vi.fn();

    const { dispose, setVisible } = mountWithVisible(
      (visible) => (
        <Motion
          visible={visible()}
          appear
          onAppearPrepare={onAppearPrepare}
          onAppearStart={onAppearStart}
          onAppearActive={onAppearActive}
          onAppearEnd={onAppearEnd}
          onEnterPrepare={onEnterPrepare}
          onEnterStart={onEnterStart}
          onEnterActive={onEnterActive}
          onEnterEnd={onEnterEnd}
        >
          content
        </Motion>
      ),
      true,
    );

    await nextFrame();

    expect(onAppearPrepare).toHaveBeenCalledTimes(1);
    expect(onAppearStart).toHaveBeenCalledTimes(1);
    expect(onAppearActive).toHaveBeenCalledTimes(1);
    expect(onAppearEnd).toHaveBeenCalledTimes(1);
    expect(onEnterPrepare).not.toHaveBeenCalled();
    expect(onEnterStart).not.toHaveBeenCalled();
    expect(onEnterActive).not.toHaveBeenCalled();
    expect(onEnterEnd).not.toHaveBeenCalled();

    setVisible(false);
    await nextFrame();

    setVisible(true);
    await nextFrame();

    expect(onAppearPrepare).toHaveBeenCalledTimes(1);
    expect(onAppearStart).toHaveBeenCalledTimes(1);
    expect(onAppearActive).toHaveBeenCalledTimes(1);
    expect(onAppearEnd).toHaveBeenCalledTimes(1);
    expect(onEnterPrepare).toHaveBeenCalledTimes(1);
    expect(onEnterStart).toHaveBeenCalledTimes(1);
    expect(onEnterActive).toHaveBeenCalledTimes(1);
    expect(onEnterEnd).toHaveBeenCalledTimes(1);

    dispose();
  });

  it("removeOnLeave 为 false 时不会在初始隐藏状态下预渲染节点", async () => {
    const { host, dispose } = mount(() => (
      <Motion visible={false} removeOnLeave={false}>
        content
      </Motion>
    ));

    await Promise.resolve();

    expect(host.firstElementChild).toBeNull();

    dispose();
  });

  it("removeOnLeave 为 false 时在 leave 后保留节点并附加 leavedClassName", async () => {
    const { host, dispose, setVisible } = mountWithVisible(
      (visible) => (
        <Motion
          visible={visible()}
          removeOnLeave={false}
          leavedClassName="motion-hidden"
        >
          content
        </Motion>
      ),
      true,
    );

    await nextFrame();

    setVisible(false);
    await nextFrame();

    const node = host.firstElementChild as HTMLElement | null;
    expect(node).not.toBeNull();
    expect(node?.className).toBe("motion-hidden");
    expect(node?.style.display).toBe("");

    dispose();
  });

  it("forceRender 为 true 且无 leavedClassName 时保留节点并隐藏", async () => {
    const { host, dispose } = mount(() => (
      <Motion visible={false} forceRender>
        content
      </Motion>
    ));

    await Promise.resolve();

    const node = host.firstElementChild as HTMLElement | null;
    expect(node).not.toBeNull();
    expect(node?.style.display).toBe("none");

    dispose();
  });

  it("异步 prepare 完成前不会进入 enter 的 start 和 active 阶段", async () => {
    const calls: string[] = [];
    let resolvePrepare!: () => void;

    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name="fade"
        onEnterPrepare={() => {
          calls.push("prepare");
          return new Promise<void>((resolve) => {
            resolvePrepare = resolve;
          });
        }}
        onEnterStart={() => {
          calls.push("start");
        }}
        onEnterActive={() => {
          calls.push("active");
        }}
        onEnterEnd={() => {
          calls.push("end");
        }}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    const node = getNode(host);
    expect(calls).toEqual(["prepare"]);
    expect(node.classList.contains("fade")).toBe(true);
    expect(node.classList.contains("fade-enter")).toBe(true);
    expect(node.classList.contains("fade-enter-prepare")).toBe(true);
    expect(node.classList.contains("fade-enter-start")).toBe(false);
    expect(node.classList.contains("fade-enter-active")).toBe(false);

    resolvePrepare();
    await Promise.resolve();

    expect(calls).toEqual(["prepare", "start", "active"]);
    expect(node.classList.contains("fade-enter-prepare")).toBe(false);
    expect(node.classList.contains("fade-enter-start")).toBe(false);
    expect(node.classList.contains("fade-enter-active")).toBe(true);

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(calls).toEqual(["prepare", "start", "active", "end"]);

    dispose();
  });

  it("异步 prepare 被 leave 打断后不会继续推进旧 enter run", async () => {
    const calls: string[] = [];
    let resolvePrepare!: () => void;

    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name="fade"
        onEnterPrepare={() => {
          calls.push("enter-prepare");
          return new Promise<void>((resolve) => {
            resolvePrepare = resolve;
          });
        }}
        onEnterStart={() => {
          calls.push("enter-start");
        }}
        onEnterActive={() => {
          calls.push("enter-active");
        }}
        onLeaveStart={() => {
          calls.push("leave-start");
        }}
        onLeaveActive={() => {
          calls.push("leave-active");
        }}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    const node = getNode(host);
    expect(calls).toEqual(["enter-prepare"]);
    expect(node.classList.contains("fade-enter-prepare")).toBe(true);

    setVisible(false);
    await nextFrame();

    expect(calls).toEqual(["enter-prepare", "leave-start", "leave-active"]);

    resolvePrepare();
    await Promise.resolve();
    await nextFrame();

    expect(calls).toEqual(["enter-prepare", "leave-start", "leave-active"]);
    expect(node.classList.contains("fade-leave-active")).toBe(true);
    expect(node.classList.contains("fade-enter-active")).toBe(false);

    dispose();
  });

  it("按顺序执行分阶段 enter 生命周期并挂载 root、phase、active class", async () => {
    const calls: string[] = [];
    const onVisibleChanged = vi.fn();

    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name="fade"
        onEnterPrepare={() => {
          calls.push("prepare");
        }}
        onEnterStart={() => {
          calls.push("start");
        }}
        onEnterActive={() => {
          calls.push("active");
        }}
        onEnterEnd={() => {
          calls.push("end");
        }}
        onVisibleChanged={onVisibleChanged}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    const node = getNode(host);
    expect(calls).toEqual(["prepare", "start", "active"]);
    expect(node.classList.contains("fade")).toBe(true);
    expect(node.classList.contains("fade-enter")).toBe(true);
    expect(node.classList.contains("fade-enter-active")).toBe(true);
    expect(node.classList.contains("fade-enter-start")).toBe(false);
    expect(node.classList.contains("fade-enter-prepare")).toBe(false);
    expect(onVisibleChanged).not.toHaveBeenCalledWith(true);

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(calls).toEqual(["prepare", "start", "active", "end"]);
    expect(onVisibleChanged).toHaveBeenLastCalledWith(true);
    expect(node.className).toBe("");

    dispose();
  });

  it("对象形式的 phase 名称可回退生成 step class，并支持显式 step 覆盖", async () => {
    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <>
        <Motion visible={visible()} name={{ base: "motion", enter: "fade-in" }}>
          fallback
        </Motion>
        <Motion
          visible={visible()}
          name={{
            base: "motion",
            enter: "zoom-in",
            enterActive: "zoom-in-running",
          }}
        >
          override
        </Motion>
      </>
    ));

    setVisible(true);
    await nextFrame();

    const fallbackNode = getNode(host, 0);
    expect(fallbackNode.classList.contains("motion")).toBe(true);
    expect(fallbackNode.classList.contains("fade-in")).toBe(true);
    expect(fallbackNode.classList.contains("fade-in-active")).toBe(true);

    const overrideNode = getNode(host, 1);
    expect(overrideNode.classList.contains("motion")).toBe(true);
    expect(overrideNode.classList.contains("zoom-in")).toBe(true);
    expect(overrideNode.classList.contains("zoom-in-running")).toBe(true);
    expect(overrideNode.classList.contains("zoom-in-active")).toBe(false);

    fallbackNode.dispatchEvent(new Event("animationend", { bubbles: true }));
    overrideNode.dispatchEvent(new Event("animationend", { bubbles: true }));

    expect(fallbackNode.className).toBe("");
    expect(overrideNode.className).toBe("");

    dispose();
  });

  it("onEnterEnd 返回 false 时继续监听后续结束事件", async () => {
    const onVisibleChanged = vi.fn();
    const onEnterEnd = vi
      .fn<
        (
          _el: HTMLElement,
          _event: Event & { deadline?: boolean },
        ) => boolean | void
      >()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);

    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name="fade"
        onEnterEnd={onEnterEnd}
        onVisibleChanged={onVisibleChanged}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    const node = getNode(host);
    node.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(onEnterEnd).toHaveBeenCalledTimes(1);
    expect(onVisibleChanged).not.toHaveBeenCalledWith(true);
    expect(node.classList.contains("fade")).toBe(true);
    expect(node.classList.contains("fade-enter")).toBe(true);
    expect(node.classList.contains("fade-enter-active")).toBe(true);

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(onEnterEnd).toHaveBeenCalledTimes(2);
    expect(onVisibleChanged).toHaveBeenLastCalledWith(true);
    expect(node.className).toBe("");

    dispose();
  });

  it("旧 enter 的结束事件不会回流影响新的 leave run", async () => {
    const calls: string[] = [];
    const onVisibleChanged = vi.fn();
    const onEnterEnd = vi
      .fn<
        (
          _el: HTMLElement,
          _event: Event & { deadline?: boolean },
        ) => boolean | void
      >()
      .mockReturnValueOnce(false)
      .mockImplementation(() => {
        calls.push("enter-end-late");
      });
    const onLeaveEnd = vi.fn(() => {
      calls.push("leave-end");
    });

    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name="fade"
        onEnterEnd={onEnterEnd}
        onLeaveEnd={onLeaveEnd}
        onVisibleChanged={onVisibleChanged}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    const node = getNode(host);
    node.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(onEnterEnd).toHaveBeenCalledTimes(1);
    expect(onVisibleChanged).not.toHaveBeenCalledWith(true);

    setVisible(false);
    await nextFrame();

    node.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(onEnterEnd).toHaveBeenCalledTimes(1);
    expect(onLeaveEnd).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["leave-end"]);
    expect(onVisibleChanged).toHaveBeenLastCalledWith(false);
    expect(host.firstElementChild).toBeNull();

    dispose();
  });

  it("对象形式的 enter 动画会等待 animationend 后再完成", async () => {
    const onEnterEnd = vi.fn();
    const onVisibleChanged = vi.fn();

    const { host, dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name={{ enter: "fade-in" }}
        onEnterEnd={onEnterEnd}
        onVisibleChanged={onVisibleChanged}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await nextFrame();

    const node = getNode(host);
    expect(node.classList.contains("fade-in")).toBe(true);
    expect(node.classList.contains("fade-in-active")).toBe(true);
    expect(onEnterEnd).not.toHaveBeenCalled();

    node.dispatchEvent(new Event("animationend", { bubbles: true }));

    expect(onEnterEnd).toHaveBeenCalledTimes(1);
    expect(onVisibleChanged).toHaveBeenLastCalledWith(true);
    expect(node.className).toBe("");

    dispose();
  });

  it("deadline 可作为完成时机的兜底", async () => {
    vi.useFakeTimers();
    const onEnterEnd = vi.fn();
    const onVisibleChanged = vi.fn();

    const { dispose, setVisible } = mountWithVisible((visible) => (
      <Motion
        visible={visible()}
        name="fade"
        deadline={100}
        onEnterEnd={onEnterEnd}
        onVisibleChanged={onVisibleChanged}
      >
        content
      </Motion>
    ));

    setVisible(true);
    await Promise.resolve();
    vi.advanceTimersByTime(16);
    await Promise.resolve();

    expect(onEnterEnd).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(onEnterEnd).toHaveBeenCalledTimes(1);
    expect(onVisibleChanged).toHaveBeenLastCalledWith(true);

    dispose();
  });

  it("透传 ref、style、class 和事件处理器到渲染元素", async () => {
    const onClick = vi.fn();
    let ref: HTMLDivElement | undefined;

    const { host, dispose } = mount(() => (
      <Motion
        visible
        ref={(el: HTMLDivElement) => {
          ref = el;
        }}
        class="custom"
        style={{ color: "red" }}
        onClick={onClick}
      >
        content
      </Motion>
    ));

    await nextFrame();

    const node = getNode<HTMLDivElement>(host);
    node.click();

    expect(ref).toBe(node);
    expect(node.className).toBe("custom");
    expect(node.style.color).toBe("red");
    expect(onClick).toHaveBeenCalledTimes(1);

    dispose();
  });
});
