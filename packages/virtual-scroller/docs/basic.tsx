import { createSignal, For } from "solid-js";
import { useVirtualScroll } from "../src";

// 生成测试数据
const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
    height: 30 + Math.random() * 70, // 随机高度 30-100px
  }));

export default function BasicDemo() {
  const [items] = createSignal(generateItems(10000));

  const scroll = useVirtualScroll({
    items,
    height: () => 400,
    estimatedItemHeight: () => 50,
    overscan: 5,
  });

  return (
    <div style={{ padding: "20px" }}>
      <p>Total items: {items().length}</p>

      <div {...scroll.containerProps()}>
        <div
          style={{
            height: `${scroll.totalHeight()}px`,
            position: "relative",
          }}
        >
          <For each={scroll.visibleItems()}>
            {(item) => (
              <div
                ref={(el) => scroll.measureItem(item.index, el)}
                style={{
                  position: "absolute",
                  top: `${item.offsetTop}px`,
                  left: 0,
                  right: 0,
                  padding: "10px",
                  "border-bottom": "1px solid #eee",
                  "box-sizing": "border-box",
                  height: `${item.height}px`,
                  display: "flex",
                  "align-items": "center",
                }}
              >
                <span style={{ color: "#999", "margin-right": "10px" }}>
                  #{item.index}
                </span>
                <span>{item.data.text}</span>
                <span style={{ "margin-left": "auto", color: "#666" }}>
                  Height: {Math.round(item.height)}px
                </span>
              </div>
            )}
          </For>
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
