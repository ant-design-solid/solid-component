import { createSignal } from "solid-js";
import { MotionGroup } from "../src";
import "./index.css";

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

  const removeById = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const removeFirst = () => {
    setItems((current) => current.slice(1));
  };

  const reset = () => {
    nextId = seed.length + 1;
    setItems(seed);
  };

  return (
    <section class="docs-motion-demo">
      <div class="docs-motion-actions">
        <button
          class="docs-motion-button docs-motion-button-primary"
          type="button"
          onClick={addItem}
        >
          Add item
        </button>

        <button
          class="docs-motion-button docs-motion-button-outline"
          type="button"
          onClick={removeFirst}
          disabled={items().length === 0}
        >
          Remove first
        </button>

        <button
          class="docs-motion-button docs-motion-button-secondary"
          type="button"
          onClick={reset}
        >
          Reset
        </button>
      </div>

      <MotionGroup each={items()} by="id" name="docs-group-item" class="docs-group-list">
        {(item) => (
          <MotionGroup.Item as="span" class="docs-group-tag">
            {item.label}
            <button
              class="docs-group-remove"
              type="button"
              aria-label={`Remove ${item.label}`}
              onClick={() => removeById(item.id)}
            >
              ×
            </button>
          </MotionGroup.Item>
        )}
      </MotionGroup>
    </section>
  );
}
