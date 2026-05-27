import { createSignal } from "solid-js";

import { MotionGroup } from "../src";

type TagItem = {
  id: number;
  label: string;
};

const seed: TagItem[] = [
  { id: 1, label: "Alpha" },
  { id: 2, label: "Beta" },
  { id: 3, label: "Gamma" },
];

export default function GroupDemo() {
  const [items, setItems] = createSignal(seed);
  let nextId = seed.length + 1;

  const addItem = () => {
    const id = nextId;
    nextId += 1;
    setItems((current) => [...current, { id, label: `Tag ${id}` }]);
  };

  const remove = (index: number) => {
    setItems((current) => {
      const next = [...current];
      next.splice(index, 1);
      return next;
    });
  };

  const reset = () => {
    nextId = seed.length + 1;
    setItems(seed);
  };

  return (
    <section
      style={{
        display: "grid",
        gap: "16px",
        padding: "20px",
        border: "1px solid #d8e1d4",
        "border-radius": "18px",
        background: "#f8fbf7",
      }}
    >
      <style>{`
        .docs-group-item {
          transition: opacity 180ms ease, transform 180ms ease, scale 180ms ease;
        }

        .docs-group-item-appear,
        .docs-group-item-enter,
        .docs-group-item-leave {
          opacity: 1;
          transform: translateY(0);
          scale: 1;
        }

        .docs-group-item-appear-start,
        .docs-group-item-enter-start,
        .docs-group-item-leave-active {
          opacity: 0;
          transform: translateY(8px);
          scale: 0.92;
        }

        .docs-group-item-appear-active,
        .docs-group-item-enter-active,
        .docs-group-item-leave-start {
          opacity: 1;
          transform: translateY(0);
          scale: 1;
        }
      `}</style>

      <div style={{ display: "flex", gap: "10px", "flex-wrap": "wrap" }}>
        <button
          type="button"
          onClick={addItem}
          style={{
            padding: "10px 14px",
            border: "1px solid #2f7a4e",
            "border-radius": "999px",
            background: "#2f7a4e",
            color: "#ffffff",
            "font-weight": 700,
            cursor: "pointer",
          }}
        >
          Add item
        </button>

        <button
          type="button"
          onClick={reset}
          style={{
            padding: "10px 14px",
            border: "1px solid #d8e1d4",
            "border-radius": "999px",
            background: "#ffffff",
            color: "#3b4a41",
            "font-weight": 700,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <MotionGroup
        each={items()}
        by="id"
        name="docs-group-item"
        style={{
          display: "flex",
          gap: "10px",
          "flex-wrap": "wrap",
          "min-height": "42px",
        }}
      >
        {(item, index) => (
          <MotionGroup.Item
            as="span"
            style={{
              display: "inline-flex",
              "align-items": "center",
              padding: "8px 12px",
              "border-radius": "999px",
              background: "#ffffff",
              border: "1px solid #d8e1d4",
              color: "#24412f",
              "font-weight": 600,
            }}
          >
            {item.label}
            <button
              style={{
                display: "inline-flex",
                "align-items": "center",
                "justify-content": "center",
                width: "18px",
                height: "18px",
                "margin-left": "8px",
                padding: "0",
                border: "none",
                "border-radius": "50%",
                background: "transparent",
                color: "#2f7a4e",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "flex-shrink": "0",
                outline: "none",
              }}
              onClick={() => remove(index())}
            >
              X
            </button>
          </MotionGroup.Item>
        )}
      </MotionGroup>
    </section>
  );
}
