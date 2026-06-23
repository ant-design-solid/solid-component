import { createSignal, For, Show } from "solid-js";
import { useVirtualScroll, useInfiniteScroll } from "../src";

// 生成测试数据
const generateItems = (count: number, startIndex = 0) =>
  Array.from({ length: count }, (_, i) => ({
    id: startIndex + i,
    text: `Item ${startIndex + i}`,
  }));

export default function InfiniteScrollDemo() {
  const [items, setItems] = createSignal(generateItems(50));
  const [loading, setLoading] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [containerHeight] = createSignal(500);

  const loadMore = () => {
    if (loading() || !hasMore()) return;
    setLoading(true);

    setTimeout(() => {
      setItems((prev) => [...prev, ...generateItems(30, prev.length)]);
      setLoading(false);
      if (items().length >= 200) {
        setHasMore(false);
      }
    }, 500);
  };

  const scroll = useVirtualScroll({
    items,
    height: containerHeight,
    estimatedItemHeight: () => 50,
    overscan: 3,
  });

  useInfiniteScroll(
    {
      hasMore,
      loading,
      onLoadMore: loadMore,
      threshold: 100,
    },
    {
      totalHeight: scroll.totalHeight,
      scrollTop: scroll.scrollTop,
      containerHeight,
    },
  );

  return (
    <div style={{ padding: "20px" }}>
      <h3>Infinite Scroll Demo</h3>
      <p>Scroll to the bottom to automatically load more items.</p>
      <p>
        Items loaded: {items().length}
        <Show when={loading()}>
          {" "}(Loading...)
        </Show>
        <Show when={!hasMore()}>
          {" "}(All items loaded)
        </Show>
      </p>

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

      <Show when={loading()}>
        <div
          style={{
            padding: "16px",
            "text-align": "center",
            color: "#666",
            "font-style": "italic",
          }}
        >
          Loading more items...
        </div>
      </Show>

      <Show when={!hasMore()}>
        <div
          style={{
            padding: "16px",
            "text-align": "center",
            color: "#999",
          }}
        >
          All items have been loaded.
        </div>
      </Show>
    </div>
  );
}
