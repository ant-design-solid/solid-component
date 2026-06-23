import { createSignal, For } from "solid-js";
import { useVirtualScroll } from "../src";

// 生成测试数据
const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i} - This is a description for item number ${i}. Click to expand for more details.`,
    expanded: false,
  }));

export default function DynamicHeightDemo() {
  const [items, setItems] = createSignal(generateItems(200));

  const toggleExpand = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], expanded: !next[index].expanded };
      return next;
    });
  };

  const scroll = useVirtualScroll({
    items,
    height: () => 500,
    estimatedItemHeight: () => 50,
    overscan: 5,
  });

  return (
    <div style={{ padding: "20px" }}>
      <h3>Dynamic Height Demo</h3>
      <p>Click items to expand/collapse. Height changes dynamically via ResizeObserver.</p>
      <p>Total items: {items().length} | Total height: {Math.round(scroll.totalHeight())}px</p>

      <div
        {...scroll.containerProps()}
        style={{
          border: "1px solid #ddd",
          "border-radius": "4px",
          "background-color": "#fff",
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
                onClick={() => toggleExpand(item.index)}
                style={{
                  position: "absolute",
                  top: `${item.offsetTop}px`,
                  left: 0,
                  right: 0,
                  padding: "12px 16px",
                  "border-bottom": "1px solid #eee",
                  "box-sizing": "border-box",
                  height: `${item.data.expanded ? 120 : 50}px`,
                  cursor: "pointer",
                  "background-color": item.data.expanded ? "#f0f7ff" : "transparent",
                  transition: "height 0.2s ease, background-color 0.2s ease",
                  display: "flex",
                  "flex-direction": "column",
                  "justify-content": "center",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", "align-items": "center" }}>
                  <span style={{ color: "#999", "margin-right": "10px", "font-size": "12px" }}>
                    #{item.index}
                  </span>
                  <span style={{ "font-weight": item.data.expanded ? "600" : "400" }}>
                    {item.data.text}
                  </span>
                  <span style={{ "margin-left": "auto", color: "#666", "font-size": "12px" }}>
                    {item.data.expanded ? "▲ Collapse" : "▼ Expand"}
                  </span>
                </div>
                {item.data.expanded && (
                  <div
                    style={{
                      "margin-top": "10px",
                      padding: "10px",
                      "background-color": "#e8f4fd",
                      "border-radius": "4px",
                      "font-size": "13px",
                      color: "#333",
                      "line-height": "1.5",
                    }}
                  >
                    Expanded content for item #{item.index}. This area shows additional details
                    that appear when the item is expanded. The virtual scroller's height cache
                    will automatically update when the height changes.
                  </div>
                )}
              </div>
            )}
          </For>
        </div>
      </div>

      <div style={{ "margin-top": "10px" }}>
        <button onClick={() => scroll.scrollTo({ index: 0 })}>Scroll to Top</button>
        <button onClick={() => scroll.scrollTo({ index: 100, align: "center" })} style={{ "margin-left": "8px" }}>
          Scroll to #100 (center)
        </button>
        <button onClick={() => scroll.scrollTo({ index: items().length - 1 })} style={{ "margin-left": "8px" }}>
          Scroll to Bottom
        </button>
      </div>
    </div>
  );
}
