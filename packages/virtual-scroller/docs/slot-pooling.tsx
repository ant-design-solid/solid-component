import { createEffect, createSignal, Index, Show } from "solid-js";
import { useVirtualScroll } from "../src";

// 生成测试数据
const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
    height: 30 + Math.random() * 70, // 随机高度 30-100px
  }));

/**
 * Slot Pooling Demo (stableItems)
 *
 * 使用 <Index> + stableItems 实现 DOM 节点池化：
 * - stableItems 长度固定（滚动时不增删 DOM 节点）
 * - <Index> 按位置跟踪，DOM 节点复用
 * - createEffect + measureItem 处理新进入 slot 的高度测量
 *
 * 对比普通的 <For> + visibleItems 模式：
 * - <For> 每次滚动都要 reconcile（新旧对比），导致大量 mount/unmount
 * - <Index> 保持 DOM 稳定，只更新数据绑定的部分
 */
export default function SlotPoolingDemo() {
  const [items] = createSignal(generateItems(10000));

  const scroll = useVirtualScroll({
    items,
    height: () => 500,
    estimatedItemHeight: () => 50,
    overscan: 5,
  });

  return (
    <div style={{ padding: "20px" }}>
      <h3>Slot Pooling Demo</h3>
      <p>
        Total items: {items().length} | Slot count: {scroll.stableItems().length}
        {" "}| Visible: {scroll.visibleItems().length} | Scroll: {Math.round(scroll.scrollTop())}px
      </p>

      <div
        {...scroll.containerProps()}
        style={{
          border: "1px solid #ddd",
          "border-radius": "4px",
        }}
      >
        <div
          style={{
            height: `${scroll.totalHeight()}px`,
            position: "relative",
          }}
        >
          {/*
           * stableItems 是固定长度的数组，长度在组件生命周期内不变。
           * <Index> 按索引跟踪每个 slot，DOM 节点保持稳定。
           * 滚动时只更新 slot 内的数据，不增删 DOM。
           *
           * 超出可见范围的 slot 值为 null，用 <Show when={item}> 跳过渲染。
           *
           * 注意：slot 复用 DOM 后 ref 不再触发，所以用 createEffect
           * 在 item 变化时调用 measureItem 来测量新项目的高度。
           */}
          <Index each={scroll.stableItems()}>{(getSlot) => {
            const item = getSlot();
            let el: HTMLDivElement | undefined;

            createEffect(() => {
              if (item && el) scroll.measureItem(item.index, el);
            });

            return (
              <Show when={item}>
                <div
                  ref={el!}
                  style={{
                    position: "absolute",
                    top: `${item!.offsetTop}px`,
                    left: 0,
                    right: 0,
                    padding: "10px",
                    "border-bottom": "1px solid #eee",
                    "box-sizing": "border-box",
                    height: `${item!.height}px`,
                    display: "flex",
                    "align-items": "center",
                  }}
                >
                  <span style={{ color: "#999", "margin-right": "10px" }}>
                    #{item!.index}
                  </span>
                  <span>{item!.data.text}</span>
                  <span style={{ "margin-left": "auto", color: "#666" }}>
                    Height: {Math.round(item!.height)}px
                  </span>
                </div>
              </Show>
            );
          }}</Index>
        </div>
      </div>

      <div style={{ "margin-top": "10px" }}>
        <button onClick={() => scroll.scrollTo({ index: 0 })}>
          Scroll to Top
        </button>
        <button
          onClick={() => scroll.scrollTo({ index: 5000 })}
          style={{ "margin-left": "8px" }}
        >
          Scroll to #5000
        </button>
        <button
          onClick={() => scroll.scrollTo({ index: items().length - 1 })}
          style={{ "margin-left": "8px" }}
        >
          Scroll to Bottom
        </button>
      </div>
    </div>
  );
}
