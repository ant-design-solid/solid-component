import { createSignal, For } from "solid-js";
import { useVirtualScroll, ScrollBar } from "../src";

// 生成测试数据
const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
  }));

export default function CustomScrollbarDemo() {
  const [items] = createSignal(generateItems(1000));

  const scroll = useVirtualScroll({
    items,
    height: () => 500,
    estimatedItemHeight: () => 50,
    overscan: 3,
  });

  return (
    <div style={{ padding: "20px" }}>
      <h3>Custom Scrollbar Demo</h3>
      <p>
        Native scrollbar is hidden. The purple gradient scrollbar is the custom one,
        rendered by the ScrollBar component.
      </p>

      <div
        style={{
          position: "relative",
          border: "1px solid #ddd",
          "border-radius": "4px",
          "background-color": "#fff",
        }}
      >
        <div
          {...scroll.containerProps()}
          style={{
            ...scroll.containerProps().style,
            overflow: "hidden",
          }}
        >
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
                    padding: "10px 16px",
                    "border-bottom": "1px solid #f0f0f0",
                    "box-sizing": "border-box",
                    height: `${item.height}px`,
                    display: "flex",
                    "align-items": "center",
                  }}
                >
                  <span style={{ color: "#999", "margin-right": "10px", "font-size": "12px" }}>
                    #{item.index}
                  </span>
                  <span>{item.data.text}</span>
                </div>
              )}
            </For>
          </div>
        </div>

        <ScrollBar
          scrollOffset={scroll.scrollTop()}
          scrollRange={scroll.totalHeight()}
          containerSize={500}
          onScroll={(offset) => scroll.scrollTo(offset)}
          onStartMove={() => scroll.setScrollMoving(true)}
          onStopMove={() => scroll.setScrollMoving(false)}
          show={true}
          style={{
            width: "10px",
            right: "2px",
          }}
          thumbStyle={{
            width: "8px",
            "border-radius": "5px",
            background: "linear-gradient(180deg, #667eea, #764ba2)",
            "margin-left": "1px",
          }}
        />
      </div>

      <div style={{ "margin-top": "10px", "font-size": "13px", color: "#666" }}>
        Scroll position: {Math.round(scroll.scrollTop())}px | Total height: {Math.round(scroll.totalHeight())}px
      </div>
    </div>
  );
}
