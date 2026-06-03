import { createMemo, createSignal, For } from "solid-js";
import Menu, { type MenuKey, type MenuMode } from "../src";
import "./index.css";

const modes = [
  {
    value: "inline",
    label: "Inline",
    description: "Submenus expand in the page flow.",
  },
  {
    value: "vertical",
    label: "Vertical",
    description: "A vertical menu with popup submenu content.",
  },
  {
    value: "horizontal",
    label: "Horizontal",
    description: "A horizontal menubar with popup submenu content.",
  },
] satisfies { value: MenuMode; label: string; description: string }[];

export default function BasicDemo() {
  const [mode, setMode] = createSignal<MenuMode>("inline");
  const [openKeys, setOpenKeys] = createSignal<MenuKey[]>(["account"]);
  const currentMode = createMemo(
    () => modes.find((item) => item.value === mode())!,
  );

  const selectMode = (nextMode: MenuMode) => {
    setMode(nextMode);
    setOpenKeys(["account"]);
  };

  return (
    <div class="sc-menu-demo">
      <div class="sc-menu-demo__toolbar" role="group" aria-label="Menu mode">
        <For each={modes}>
          {(item) => (
            <button
              type="button"
              classList={{
                "sc-menu-demo__mode": true,
                "sc-menu-demo__mode--active": mode() === item.value,
              }}
              aria-pressed={mode() === item.value}
              onClick={() => selectMode(item.value)}
            >
              {item.label}
            </button>
          )}
        </For>
      </div>
      <p class="sc-menu-demo__description">{currentMode().description}</p>

      <Menu.Root
        mode={mode()}
        openKeys={openKeys()}
        defaultSelectedKeys={["profile"]}
        onOpenChange={setOpenKeys}
        class="sc-menu"
      >
        <Menu.Item key="overview">Overview</Menu.Item>

        <Menu.Submenu key="account">
          <Menu.Item>
            {(state) => (
              <span class="sc-menu__label">
                Account
                <span class="sc-menu__indicator">
                  {state.open ? "Open" : "Closed"}
                </span>
              </span>
            )}
          </Menu.Item>
          <Menu.SubmenuContent>
            <Menu.Item key="profile">Profile</Menu.Item>
            <Menu.Item key="security">Security</Menu.Item>
            <Menu.Item key="billing">Billing</Menu.Item>
          </Menu.SubmenuContent>
        </Menu.Submenu>

        <Menu.Submenu key="workspace">
          <Menu.Item>
            {(state) => (
              <span class="sc-menu__label">
                Workspace
                <span class="sc-menu__indicator">
                  {state.open ? "Open" : "Closed"}
                </span>
              </span>
            )}
          </Menu.Item>
          <Menu.SubmenuContent>
            <Menu.Item key="members">Members</Menu.Item>
            <Menu.Item key="projects">Projects</Menu.Item>
          </Menu.SubmenuContent>
        </Menu.Submenu>

        <Menu.Item key="support">Support</Menu.Item>
      </Menu.Root>
    </div>
  );
}
