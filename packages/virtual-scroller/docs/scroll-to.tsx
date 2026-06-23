import { createSignal, For } from "solid-js";
import { useVirtualScroll } from "../src";
import type { ScrollAlign } from "../src/types";

// 生成测试数据
const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
  }));

export default function ScrollToDemo() {
  const [items] = createSignal(generateItems(500));
  const [index, setIndex] = createSignal(250);
  const [align, setAlign] = createSignal<ScrollAlign>("auto");
  const [lastAction, setLastAction] = createSignal("");

  const scroll = useVirtualScroll({
    items,
    height: () => 500,
    estimatedItemHeight: () => 50,
    overscan: 3,
  });

  const handleScrollTo = (targetIndex: number, targetAlign: ScrollAlign) => {
    const label = `Scroll to #${targetIndex} (${targetAlign})`;
    setLastAction(label);
    scroll.scrollTo({ index: targetIndex, align: targetAlign });
  };

  const handleCustomScroll = () => {
    const label = `Scroll to #${index()} (${align()})`;
    setLastAction(label);
    scroll.scrollTo({ index: index(), align: align() });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h3>ScrollTo Demo</h3>
      <p>Use the buttons below to programmatically scroll to specific items.</p>

      <div style={{ "margin-bottom": "12px", display: "flex", "flex-wrap": "wrap", gap: "8px" }}>
        <button onClick={() => handleScrollTo(0, "start")}>
          Scroll to #0 (start)
        </button>
        <button onClick={() => handleScrollTo(250, "center")}>
          Scroll to #250 (center)
        </button>
        <button onClick={() => handleScrollTo(499, "end")}>
          Scroll to #499 (end)
        </button>
        <button onClick={() => handleScrollTo(100, "auto")}>
          Scroll to #100 (auto)
        </button>
      </div>

      <div style={{ "margin-bottom": "12px", display: "flex", "align-items": "center", gap: "8px" }}>
        <span>Custom:</span>
        <input
          type="number"
          min="0"
          max="499"
          value={index()}
          onInput={(e) => setIndex(Number(e.currentTarget.value))}
          style={{
            width: "80px",
            padding: "4px 8px",
            border: "1px solid #ccc",
            "border-radius": "4px",
          }}
        />
        <select
          value={align()}
          onChange={(e) => setAlign(e.currentTarget.value as ScrollAlign)}
          style={{
            padding: "4px 8px",
            border: "1px solid #ccc",
            "border-radius": "4px",
          }}
        >
          <option value="start">start</option>
          <option value="center">center</option>
          <option value="end">end</option>
          <option value="auto">auto</option>
        </select>
        <button onClick={handleCustomScroll}>Go</button>

        <span style={{ "margin-left": "12px", color: "#666", "font-size": "13px" }}>
          {lastAction() && `Last action: ${lastAction()}`}
        </span>
      </div>

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
                style={{
                  position: "absolute",
                  top: `${item.offsetTop}px`,
                  left: 0,
                  right: 0,
                  padding: "12px 16px",
                  "border-bottom": "1px solid #eee",
                  "box-sizing": "border-box",
                  height: `${item.height}px`,
                  display: "flex",
                  "align-items": "center",
                  "background-color": item.index === Math.round(scroll.scrollTop() / 50) ? "#fff3cd" : "transparent",
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

      <div style={{ "margin-top": "10px", "font-size": "13px", color: "#666" }}>
        Scroll position: {Math.round(scroll.scrollTop())}px | Visible items: {scroll.visibleItems().length}
      </div>
    </div>
  );
}
