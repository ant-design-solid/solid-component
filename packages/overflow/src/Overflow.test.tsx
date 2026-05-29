import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import Overflow from ".";
import { mount, nextFrame } from "../../.test/render";
import { measureElement } from "../../.test/resize-observer";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Overflow", () => {
  it("limits the initial responsive render to the measurement window", async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      key: index,
      label: `Item ${index}`,
    }));

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li" />
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    expect(root.children).toHaveLength(2);
    expect(root.children[0].textContent).toBe("Item 0");

    dispose();
  });

  it("measures from the tail when collapse is start", async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      key: index,
      label: `Item ${index}`,
    }));

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive" collapse="start">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li" />
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    expect(root.children).toHaveLength(2);
    expect(root.children[0].textContent).toBe("Item 49");

    dispose();
  });

  it("keeps measured item nodes stable when expanding from the tail", async () => {
    const items = Array.from({ length: 4 }, (_, index) => ({
      key: index,
      label: `Item ${index}`,
    }));

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive" collapse="start">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 120);

    const last = Array.from(root.children).find(
      (child) => child.textContent === "Item 3",
    );
    expect(last).toBeDefined();

    for (let index = 0; index < 4; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        await measureElement(
          child,
          child.textContent?.startsWith("+") ? 20 : 30,
        );
      }
    }

    expect(
      Array.from(root.children).find((child) => child.textContent === "Item 3"),
    ).toBe(last);

    dispose();
  });

  it("renders the headless compound parts in order", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul">
        <Overflow.Prefix as="li">Prefix</Overflow.Prefix>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li" />
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul");
    expect(root).not.toBeNull();
    expect(Array.from(root!.children).map((node) => node.textContent)).toEqual([
      "Prefix",
      "Alpha",
      "Beta",
      "Suffix",
    ]);

    dispose();
  });

  it("limits visible items with numeric maxCount and shows rest", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount={2}>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    const [first, second, third, rest] = Array.from(
      root.children,
    ) as HTMLElement[];

    expect(rest.textContent).toBe("+1");
    expect(first.getAttribute("aria-hidden")).toBe("false");
    expect(second.getAttribute("aria-hidden")).toBe("false");
    expect(third.getAttribute("aria-hidden")).toBe("true");

    dispose();
  });

  it("supports standalone items with numeric maxCount", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount={2}>
        <Overflow.Item as="li" order={0}>
          Alpha
        </Overflow.Item>
        <Overflow.Item as="li" order={1}>
          Beta
        </Overflow.Item>
        <Overflow.Item as="li" order={2}>
          Gamma
        </Overflow.Item>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    const [first, second, third, rest] = Array.from(
      root.children,
    ) as HTMLElement[];

    expect(rest.textContent).toBe("+1");
    expect(first.getAttribute("aria-hidden")).toBe("false");
    expect(second.getAttribute("aria-hidden")).toBe("false");
    expect(third.getAttribute("aria-hidden")).toBe("true");

    dispose();
  });

  it("supports standalone items with collapse start", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount={2} collapse="start">
        <Overflow.Item as="li" order={0}>
          Alpha
        </Overflow.Item>
        <Overflow.Item as="li" order={1}>
          Beta
        </Overflow.Item>
        <Overflow.Item as="li" order={2}>
          Gamma
        </Overflow.Item>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    const [first, second, third, rest] = Array.from(
      root.children,
    ) as HTMLElement[];

    expect(rest.textContent).toBe("+1");
    expect(first.getAttribute("aria-hidden")).toBe("true");
    expect(second.getAttribute("aria-hidden")).toBe("false");
    expect(third.getAttribute("aria-hidden")).toBe("false");

    dispose();
  });

  it("calls onVisibleChange with the visible item count in numeric mode", async () => {
    const onVisibleChange = vi.fn();
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount={2} onVisibleChange={onVisibleChange}>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    expect(onVisibleChange).toHaveBeenCalledWith(2);

    dispose();
  });

  it("passes onVisibleChange through the compact Overflow API", async () => {
    const onVisibleChange = vi.fn();
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { dispose } = mount(() => (
      <Overflow
        data={items}
        by="key"
        maxCount={2}
        onVisibleChange={onVisibleChange}
      >
        {(item) => item.label}
      </Overflow>
    ));

    await nextFrame();

    expect(onVisibleChange).toHaveBeenCalledWith(2);

    dispose();
  });

  it("calls onVisibleChange with the latest visible item count in responsive mode", async () => {
    const onVisibleChange = vi.fn();
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root
        as="ul"
        maxCount="responsive"
        onVisibleChange={onVisibleChange}
      >
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 80);

    const listItems = Array.from(root.children) as HTMLElement[];
    await measureElement(listItems[0], 30);
    await measureElement(listItems[1], 30);
    await measureElement(listItems[2], 30);

    const rest = root.children[3] as HTMLElement;
    await measureElement(rest, 20);
    await nextFrame();

    expect(onVisibleChange).toHaveBeenLastCalledWith(2);

    await measureElement(root, 120);
    await nextFrame();

    expect(onVisibleChange).toHaveBeenLastCalledWith(3);

    dispose();
  });

  it("disables overflow positioning when maxCount is invalidate", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="invalidate">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    const children = Array.from(root.children) as HTMLElement[];

    expect(children.map((child) => child.textContent)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);

    for (const child of children) {
      expect(child.style.position).toBe("");
      expect(child.style.opacity).toBe("");
      expect(child.style.order).toBe("");
      expect(child.getAttribute("aria-hidden")).toBe("false");
    }

    dispose();
  });

  it("hides overflowed items and shows rest in responsive mode", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 80);

    const listItems = Array.from(root.children) as HTMLElement[];
    await measureElement(listItems[0], 30);
    await measureElement(listItems[1], 30);
    await measureElement(listItems[2], 30);

    const rest = root.children[3] as HTMLElement;
    await measureElement(rest, 20);

    expect(rest.textContent).toBe("+1");
    expect(listItems[0].getAttribute("aria-hidden")).toBe("false");
    expect(listItems[1].getAttribute("aria-hidden")).toBe("false");
    expect(listItems[2].getAttribute("aria-hidden")).toBe("true");
    expect(listItems[2].style.position).toBe("absolute");

    dispose();
  });

  it("hides head items and shows rest before visible items when collapse is start", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive" collapse="start">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 80);

    for (let index = 0; index < 4; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        await measureElement(
          child,
          child.textContent?.startsWith("+") ? 20 : 30,
        );
      }
    }
    await nextFrame();

    const [first, second, third, rest] = Array.from(
      root.children,
    ) as HTMLElement[];

    expect(rest.textContent).toBe("+1");
    expect(rest.style.order).toBe("1");
    expect(first.getAttribute("aria-hidden")).toBe("true");
    expect(second.getAttribute("aria-hidden")).toBe("false");
    expect(third.getAttribute("aria-hidden")).toBe("false");
    expect(first.style.position).toBe("absolute");

    dispose();
  });

  it("keeps prefix rest visible tail items and suffix ordered in start collapse", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive" collapse="start">
        <Overflow.Prefix as="li">Prefix</Overflow.Prefix>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 140);

    for (let index = 0; index < 4; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        if (child.textContent === "Prefix") {
          await measureElement(child, 20);
        } else if (child.textContent === "Suffix") {
          await measureElement(child, 40);
        } else if (child.textContent?.startsWith("+")) {
          await measureElement(child, 20);
        } else {
          await measureElement(child, 30);
        }
      }
    }
    await nextFrame();

    const ordered = Array.from(root.children)
      .map((child) => ({
        text: child.textContent,
        order: Number((child as HTMLElement).style.order || 0),
        hidden: child.getAttribute("aria-hidden"),
      }))
      .sort((a, b) => a.order - b.order)
      .map((item) => `${item.text}:${item.hidden}`);

    expect(ordered).toEqual([
      "Prefix:false",
      "Alpha:true",
      "+1:false",
      "Beta:false",
      "Gamma:false",
      "Suffix:false",
    ]);

    dispose();
  });

  it("accounts for prefix and suffix widths when calculating visible items", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive">
        <Overflow.Prefix as="li">Prefix</Overflow.Prefix>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 140);

    const [prefix, first, second, third, rest, suffix] = Array.from(
      root.children,
    ) as HTMLElement[];

    await measureElement(prefix, 20);
    await measureElement(first, 30);
    await measureElement(second, 30);
    await measureElement(third, 30);
    await measureElement(rest, 20);
    await measureElement(suffix, 40);

    expect(rest.textContent).toBe("+1");
    expect(first.getAttribute("aria-hidden")).toBe("false");
    expect(second.getAttribute("aria-hidden")).toBe("false");
    expect(third.getAttribute("aria-hidden")).toBe("true");
    expect(prefix.getAttribute("aria-hidden")).toBe("false");
    expect(suffix.getAttribute("aria-hidden")).toBe("false");

    dispose();
  });

  it("resets suffix absolute positioning when overflow clears", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive">
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 100);

    for (let index = 0; index < 8; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        if (child.textContent === "Suffix") {
          await measureElement(child, 40);
        } else if (child.textContent?.startsWith("+")) {
          await measureElement(child, 20);
        } else {
          await measureElement(child, 30);
        }
      }
    }

    const suffix = Array.from(root.children).find(
      (child) => child.textContent === "Suffix",
    ) as HTMLElement;

    expect(suffix.style.position).toBe("absolute");
    expect(suffix.style.left).toBe("50px");

    await measureElement(root, 180);
    await nextFrame();

    expect(suffix.style.position).toBe("");
    expect(suffix.style.left).toBe("");

    dispose();
  });

  it("positions suffix after rest when the root has a flex gap", async () => {
    const items = [
      { key: "a", label: "Alpha" },
      { key: "b", label: "Beta" },
      { key: "c", label: "Gamma" },
    ];

    const { host, dispose } = mount(() => (
      <Overflow.Root
        as="ul"
        maxCount="responsive"
        style={{ display: "flex", gap: "8px", position: "relative" }}
      >
        <Overflow.Prefix as="li">Prefix</Overflow.Prefix>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 140);

    for (let index = 0; index < 8; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        if (child.textContent === "Prefix") {
          await measureElement(child, 20);
        } else if (child.textContent === "Suffix") {
          await measureElement(child, 40);
        } else if (child.textContent?.startsWith("+")) {
          await measureElement(child, 20);
        } else {
          await measureElement(child, 30);
        }
      }
    }

    const suffix = Array.from(root.children).find(
      (child) => child.textContent === "Suffix",
    ) as HTMLElement;

    expect(suffix.style.position).toBe("absolute");
    expect(suffix.style.left).toBe("94px");

    dispose();
  });

  it("can collapse all items to keep rest and suffix separated", async () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      key: index,
      label: `Item ${index}`,
    }));

    const { host, dispose } = mount(() => (
      <Overflow.Root
        as="ul"
        maxCount="responsive"
        style={{ display: "flex", gap: "8px", position: "relative" }}
      >
        <Overflow.Prefix as="li">Prefix</Overflow.Prefix>
        <Overflow.Items data={items} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 320);

    for (let index = 0; index < 8; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        if (child.textContent === "Prefix") {
          await measureElement(child, 110);
        } else if (child.textContent === "Suffix") {
          await measureElement(child, 130);
        } else if (child.textContent?.startsWith("+")) {
          await measureElement(child, 90);
        } else {
          await measureElement(child, 80);
        }
      }
    }

    const children = Array.from(root.children) as HTMLElement[];
    const rest = children.find((child) => child.textContent?.startsWith("+"))!;
    const suffix = children.find((child) => child.textContent === "Suffix")!;
    const first = children.find((child) => child.textContent === "Item 0")!;

    expect(rest.textContent).toBe("+5");
    expect(first.getAttribute("aria-hidden")).toBe("true");
    expect(suffix.style.position).toBe("absolute");
    expect(suffix.style.left).toBe("216px");

    dispose();
  });

  it("uses the latest rest width after omitted count shrinks", async () => {
    const initialItems = Array.from({ length: 101 }, (_, index) => ({
      key: index,
      label: `Item ${index}`,
    }));
    const [items, setItems] = createSignal(initialItems);

    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive">
        <Overflow.Items data={items()} by="key">
          {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
        </Overflow.Items>
        <Overflow.Rest as="li">{(count) => `+${count}`}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = host.querySelector("ul")!;
    await measureElement(root, 85);

    for (let index = 0; index < 8; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        await measureElement(
          child,
          child.textContent?.startsWith("+") ? 50 : 30,
        );
      }
    }

    setItems(initialItems.slice(0, 3));
    await nextFrame();
    await measureElement(root, 85);

    for (let index = 0; index < 8; index += 1) {
      for (const child of Array.from(root.children) as HTMLElement[]) {
        await measureElement(
          child,
          child.textContent?.startsWith("+") ? 20 : 30,
        );
      }
    }

    const [first, second, third, rest] = Array.from(
      root.children,
    ) as HTMLElement[];

    expect(rest.textContent).toBe("+1");
    expect(first.getAttribute("aria-hidden")).toBe("false");
    expect(second.getAttribute("aria-hidden")).toBe("false");
    expect(third.getAttribute("aria-hidden")).toBe("true");

    dispose();
  });
});
