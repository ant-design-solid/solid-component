import Menu from "../src";
import "./index.css";

export default function OverflowDemo() {
  return (
    <div class="sc-menu-demo">
      <p class="sc-menu-demo__description">
        Resize-constrained horizontal menus collapse overflowed items into More.
      </p>

      <Menu.Root
        mode="horizontal"
        class="sc-menu"
        style={{ width: "260px" }}
        defaultSelectedKeys={["projects"]}
      >
        <Menu.Item key="overview">Overview</Menu.Item>
        <Menu.Item key="activity">Activity</Menu.Item>
        <Menu.Item key="projects">Projects</Menu.Item>
        <Menu.Item key="members">Members</Menu.Item>
        <Menu.Item key="settings">Settings</Menu.Item>
        <Menu.More>More</Menu.More>
      </Menu.Root>
    </div>
  );
}
