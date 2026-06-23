import Overflow from "../src";

const items = [
  { key: "1", label: "Alpha" },
  { key: "2", label: "Beta" },
  { key: "3", label: "Gamma" },
  { key: "4", label: "Delta" },
  { key: "5", label: "Epsilon" },
];

export default function BasicDemo() {
  return (
    <div style={{ width: "320px", border: "1px solid #ddd", padding: "12px" }}>
      <Overflow.Root
        as="ul"
        maxCount="responsive"
        style={{
          display: "flex",
          gap: "8px",
          margin: 0,
          padding: 0,
          "list-style": "none",
          position: "relative",
        }}
      >
        <Overflow.Prefix
          as="li"
          style={{
            "white-space": "nowrap",
          }}
        >
          Selected:
        </Overflow.Prefix>

        <Overflow.Items data={items} itemKey="key">
          {(item) => (
            <Overflow.Item
              as="li"
              style={{
                padding: "2px 8px",
                border: "1px solid #ccc",
                "border-radius": "999px",
                "white-space": "nowrap",
              }}
            >
              {item.label}
            </Overflow.Item>
          )}
        </Overflow.Items>

        <Overflow.Rest
          as="li"
          style={{
            padding: "2px 8px",
            border: "1px solid #ccc",
            "border-radius": "999px",
            "white-space": "nowrap",
          }}
        />

        <Overflow.Suffix
          as="li"
          style={{
            "white-space": "nowrap",
          }}
        >
          more actions
        </Overflow.Suffix>
      </Overflow.Root>
    </div>
  );
}
