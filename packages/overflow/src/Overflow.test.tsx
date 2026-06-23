import { afterEach, describe, expect, it, vi } from "vitest";
import Overflow from ".";
import { mount, nextFrame } from "../../.test/render";
import { measureElement } from "../../.test/resize-observer";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const renderRest = (info: { omittedCount: number }) => `+${info.omittedCount}`;

const items = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta" },
  { key: "c", label: "Gamma" },
];

function getRoot(host: HTMLElement) {
  return host.querySelector("ul")!;
}

function getChildren(root: Element) {
  return Array.from(root.children) as HTMLElement[];
}

function getHiddenStates(...elements: HTMLElement[]) {
  return elements.map((element) => element.getAttribute("aria-hidden"));
}

function DataItems() {
  return (
    <Overflow.Items data={items} itemKey="key">
      {(item) => <Overflow.Item as="li">{item.label}</Overflow.Item>}
    </Overflow.Items>
  );
}

async function measureChildren(
  root: Element,
  getWidth: (child: HTMLElement) => number,
  rounds = 1,
) {
  for (let index = 0; index < rounds; index += 1) {
    for (const child of getChildren(root)) {
      await measureElement(child, getWidth(child));
    }
  }
}

describe("Overflow", () => {
  it("supports numeric overflow and onOverflowChange through the compact API", async () => {
    const onOverflowChange = vi.fn();

    const { host, dispose } = mount(() => (
      <Overflow
        as="ul"
        data={items}
        itemKey="key"
        maxCount={2}
        rest={renderRest}
        onOverflowChange={onOverflowChange}
      >
        {(item) => item.label}
      </Overflow>
    ));

    await nextFrame();

    const [first, second, third, rest] = getChildren(getRoot(host));

    expect(rest.textContent).toBe("+1");
    expect(getHiddenStates(first, second, third)).toEqual([
      "false",
      "false",
      "true",
    ]);
    expect(onOverflowChange).toHaveBeenLastCalledWith({
      omittedCount: 1,
      visibleKeys: ["a", "b"],
      omittedKeys: ["c"],
    });

    dispose();
  });

  it("supports standalone items with collapse start", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount={2} collapse="start">
        <Overflow.Item as="li" index={0}>
          Alpha
        </Overflow.Item>
        <Overflow.Item as="li" index={1}>
          Beta
        </Overflow.Item>
        <Overflow.Item as="li" index={2}>
          Gamma
        </Overflow.Item>
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const [first, second, third, rest] = getChildren(getRoot(host));

    expect(rest.textContent).toBe("+1");
    expect(getHiddenStates(first, second, third)).toEqual([
      "true",
      "false",
      "false",
    ]);

    dispose();
  });

  it("measures standalone responsive items before the first ready state", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive">
        <Overflow.Item as="li" key="a">
          Alpha
        </Overflow.Item>
        <Overflow.Item as="li" key="b">
          Beta
        </Overflow.Item>
        <Overflow.Item as="li" key="c">
          Gamma
        </Overflow.Item>
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const children = getChildren(getRoot(host));

    expect(children).toHaveLength(4);
    for (const child of children) {
      expect(child.getAttribute("aria-hidden")).toBe("true");
      expect(child.style.position).toBe("absolute");
      expect(child.style.visibility).toBe("hidden");
    }

    dispose();
  });

  it("shows counted standalone items before container measurement", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive" preview={{ count: 2 }}>
        <Overflow.Item as="li" key="a">
          Alpha
        </Overflow.Item>
        <Overflow.Item as="li" key="b">
          Beta
        </Overflow.Item>
        <Overflow.Item as="li" key="c">
          Gamma
        </Overflow.Item>
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const [first, second, third, rest] = getChildren(getRoot(host));

    expect(getHiddenStates(first, second, third, rest)).toEqual([
      "false",
      "false",
      "true",
      "true",
    ]);
    expect(third.style.position).toBe("absolute");
    expect(third.style.visibility).toBe("hidden");

    dispose();
  });

  it("limits the initial responsive render and then hides overflowed items", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root
        as="ul"
        maxCount="responsive"
        preview={{ itemWidth: 30 }}
      >
        <DataItems />
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = getRoot(host);
    expect(root.children).toHaveLength(2);
    expect(root.children[0].textContent).toBe("Alpha");

    await measureElement(root, 80);
    await measureChildren(
      root,
      (child) => (child.textContent?.startsWith("+") ? 20 : 30),
      3,
    );
    await nextFrame();

    const [first, second, third, rest] = getChildren(root);

    expect(rest.textContent).toBe("+1");
    expect(getHiddenStates(first, second, third)).toEqual([
      "false",
      "false",
      "true",
    ]);
    expect(third.style.position).toBe("absolute");

    dispose();
  });

  it("measures from the tail and places rest before visible items when collapse is start", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="responsive" collapse="start">
        <DataItems />
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = getRoot(host);
    expect(root.children).toHaveLength(2);
    expect(root.children[0].textContent).toBe("Gamma");

    await measureElement(root, 80);
    await measureChildren(
      root,
      (child) => (child.textContent?.startsWith("+") ? 20 : 30),
      4,
    );
    await nextFrame();

    const [first, second, third, rest] = getChildren(root);

    expect(rest.textContent).toBe("+1");
    expect(rest.style.order).toBe("1");
    expect(getHiddenStates(first, second, third)).toEqual([
      "true",
      "false",
      "false",
    ]);

    dispose();
  });

  it("positions suffix after rest when responsive overflow uses fixed siblings and gap", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root
        as="ul"
        maxCount="responsive"
        style={{ display: "flex", gap: "8px", position: "relative" }}
      >
        <Overflow.Prefix as="li">Prefix</Overflow.Prefix>
        <DataItems />
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
        <Overflow.Suffix as="li">Suffix</Overflow.Suffix>
      </Overflow.Root>
    ));

    await nextFrame();

    const root = getRoot(host);
    await measureElement(root, 140);

    await measureChildren(
      root,
      (child) => {
        if (child.textContent === "Prefix") {
          return 20;
        }
        if (child.textContent === "Suffix") {
          return 40;
        }
        if (child.textContent?.startsWith("+")) {
          return 20;
        }
        return 30;
      },
      8,
    );

    const suffix = getChildren(root).find(
      (child) => child.textContent === "Suffix",
    ) as HTMLElement;
    const rest = getChildren(root).find((child) =>
      child.textContent?.startsWith("+"),
    ) as HTMLElement;

    expect(rest.getAttribute("aria-hidden")).toBe("false");
    expect(suffix.style.position).toBe("absolute");
    expect(suffix.style.left).toBe("94px");

    dispose();
  });

  it("disables overflow positioning when maxCount is invalidate", async () => {
    const { host, dispose } = mount(() => (
      <Overflow.Root as="ul" maxCount="invalidate">
        <DataItems />
        <Overflow.Rest as="li">{renderRest}</Overflow.Rest>
      </Overflow.Root>
    ));

    await nextFrame();

    const children = getChildren(getRoot(host));

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
});
