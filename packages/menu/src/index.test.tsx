import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { mount, nextFrame } from "../../.test/render";
import Menu from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function queryByText(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll("*")).find(
    node => node.textContent?.trim() === text,
  ) as HTMLElement | undefined;
}

describe("Menu", () => {
  it("supports polymorphic composition and uncontrolled selection", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root as="ul" defaultSelectedKeys={["home"]}>
        <Menu.Item as="li" key="home">
          {state => (state.selected ? "Home selected" : "Home")}
        </Menu.Item>
        <Menu.Item as="li" key="settings">
          Settings
        </Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    const items = root.querySelectorAll('[role="menuitem"]');

    expect(root.tagName).toBe("UL");
    expect(items[0].tagName).toBe("LI");
    expect(items[0].textContent).toContain("Home selected");

    dispose();
  });

  it("syncs controlled selected/open state and derives submenu selection", async () => {
    const onSelectionChange = vi.fn();

    const { host, dispose } = mount(() => {
      const [selectedKeys, setSelectedKeys] = createSignal<(string | number)[]>(["profile"]);
      const [openKeys, setOpenKeys] = createSignal<(string | number)[]>(["account"]);

      return (
        <Menu.Root
          selectedKeys={selectedKeys()}
          openKeys={openKeys()}
          onSelectionChange={(nextKeys) => {
            onSelectionChange(nextKeys);
            setSelectedKeys(nextKeys);
          }}
          onOpenChange={setOpenKeys}
        >
          <Menu.Submenu key="account">
            <Menu.Item>
              {state => (state.selected ? "Account selected" : "Account")}
            </Menu.Item>
            <Menu.SubmenuContent>
              <Menu.Item key="profile">Profile</Menu.Item>
              <Menu.Item key="billing">Billing</Menu.Item>
            </Menu.SubmenuContent>
          </Menu.Submenu>
        </Menu.Root>
      );
    });

    await nextFrame();

    const trigger = host.querySelector('[data-menu-key="account"]') as HTMLElement;
    const billing = host.querySelector('[data-menu-key="billing"]') as HTMLElement;

    expect(trigger.textContent).toContain("Account selected");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    billing.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextFrame();

    expect(onSelectionChange).toHaveBeenCalled();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    dispose();
  });

  it("moves focus from root into the selected top-level entry on arrow navigation", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="vertical" defaultSelectedKeys={["settings"]}>
        <Menu.Item key="home">Home</Menu.Item>
        <Menu.Item key="settings">Settings</Menu.Item>
        <Menu.Item key="help">Help</Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    root.focus();
    await nextFrame();

    root.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );
    await nextFrame();

    expect(document.activeElement).toBe(
      host.querySelector('[data-menu-key="settings"]'),
    );

    dispose();
  });

  it("lets root onKeyDown cancel built-in focus entry", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root
        mode="vertical"
        defaultSelectedKeys={["settings"]}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
          }
        }}
      >
        <Menu.Item key="home">Home</Menu.Item>
        <Menu.Item key="settings">Settings</Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const root = host.firstElementChild as HTMLElement;
    root.focus();
    await nextFrame();

    root.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );
    await nextFrame();

    expect(document.activeElement).toBe(root);

    dispose();
  });

  it("supports nested keyboard navigation in inline mode", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="inline" defaultOpenKeys={["account"]}>
        <Menu.Item key="home">Home</Menu.Item>
        <Menu.Submenu key="account">
          <Menu.Item>Account</Menu.Item>
          <Menu.SubmenuContent>
            <Menu.Item key="profile">Profile</Menu.Item>
            <Menu.Item key="billing">Billing</Menu.Item>
          </Menu.SubmenuContent>
        </Menu.Submenu>
        <Menu.Item key="help">Help</Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const items = host.querySelectorAll('[role="menuitem"]');
    const accountTrigger = host.querySelector('[data-menu-key="account"]') as HTMLElement;

    (items[0] as HTMLElement).focus();
    await nextFrame();
    (items[0] as HTMLElement).dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );
    await nextFrame();

    expect(document.activeElement).toBe(accountTrigger);

    accountTrigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowRight",
      }),
    );
    await nextFrame();

    expect(queryByText(host, "Profile")?.getAttribute("tabindex")).toBe("0");

    const profile = queryByText(host, "Profile") as HTMLElement;
    profile.focus();
    await nextFrame();
    profile.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }),
    );
    await nextFrame();

    expect(document.activeElement).toBe(accountTrigger);
    expect(accountTrigger.getAttribute("aria-expanded")).toBe("false");

    dispose();
  });

  it("lets item onKeyDown cancel built-in sibling navigation", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="vertical">
        <Menu.Item
          key="home"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
            }
          }}
        >
          Home
        </Menu.Item>
        <Menu.Item key="settings">Settings</Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const home = host.querySelector('[data-menu-key="home"]') as HTMLElement;
    home.focus();
    await nextFrame();

    home.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );
    await nextFrame();

    expect(document.activeElement).toBe(home);

    dispose();
  });

  it("clears hover active state when the pointer leaves an unfocused item", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="vertical">
        <Menu.Item key="home">
          {state => (state.active ? "Home active" : "Home")}
        </Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const home = host.querySelector('[data-menu-key="home"]') as HTMLElement;
    home.dispatchEvent(new MouseEvent("mouseenter"));
    await nextFrame();

    expect(home.textContent).toBe("Home active");
    expect(home.getAttribute("tabindex")).toBe("0");

    home.dispatchEvent(new MouseEvent("mouseleave"));
    await nextFrame();

    expect(home.textContent).toBe("Home");
    expect(home.getAttribute("tabindex")).toBe("-1");

    dispose();
  });

  it("keeps active state when a focused item receives mouseleave", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="vertical">
        <Menu.Item key="home">Home</Menu.Item>
      </Menu.Root>
    ));

    await nextFrame();

    const home = host.querySelector('[data-menu-key="home"]') as HTMLElement;
    home.focus();
    await nextFrame();

    expect(home.getAttribute("tabindex")).toBe("0");

    home.dispatchEvent(new MouseEvent("mouseleave"));
    await nextFrame();

    expect(document.activeElement).toBe(home);
    expect(home.getAttribute("tabindex")).toBe("0");

    dispose();
  });

  it("lets submenu item onKeyDown cancel built-in submenu opening", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="vertical">
        <Menu.Submenu key="account">
          <Menu.Item
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
              }
            }}
          >
            Account
          </Menu.Item>
          <Menu.SubmenuContent>
            <Menu.Item key="profile">Profile</Menu.Item>
          </Menu.SubmenuContent>
        </Menu.Submenu>
      </Menu.Root>
    ));

    await nextFrame();

    const trigger = host.querySelector('[data-menu-key="account"]') as HTMLElement;
    trigger.focus();
    await nextFrame();

    trigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowRight",
      }),
    );
    await nextFrame();

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    dispose();
  });

  it("opens popup submenu on click and closes after selection", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="vertical" submenuTrigger="click">
        <Menu.Submenu key="account">
          <Menu.Item>Account</Menu.Item>
          <Menu.SubmenuContent>
            <Menu.Item key="profile">Profile</Menu.Item>
          </Menu.SubmenuContent>
        </Menu.Submenu>
      </Menu.Root>
    ));

    await nextFrame();

    const trigger = host.querySelector('[data-menu-key="account"]') as HTMLElement;
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextFrame();

    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const profile = host.querySelector('[data-menu-key="profile"]') as HTMLElement;
    profile.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextFrame();

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    dispose();
  });

  it("renders stable headless markup in the browser", async () => {
    const { host, dispose } = mount(() => (
      <Menu.Root mode="horizontal" defaultOpenKeys={["account"]}>
        <Menu.Item key="home">Home</Menu.Item>
        <Menu.Submenu key="account">
          <Menu.Item>Account</Menu.Item>
          <Menu.SubmenuContent>
            <Menu.Item key="profile">Profile</Menu.Item>
          </Menu.SubmenuContent>
        </Menu.Submenu>
      </Menu.Root>
    ));

    await nextFrame();

    expect(host.innerHTML).toContain('role="menubar"');
    expect(host.innerHTML).toContain('role="menuitem"');
    expect(host.innerHTML).toContain('aria-expanded="true"');

    dispose();
  });

});
