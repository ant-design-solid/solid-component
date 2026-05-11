import { createSignal, type JSX } from "solid-js";

import { Polymorphic } from "../src";

function DemoLink(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      style={{
        display: "inline-flex",
        "align-items": "center",
        gap: "8px",
        padding: "10px 14px",
        "border-radius": "10px",
        "text-decoration": "none",
        "background-color": "#1677ff",
        color: "#fff",
        "font-weight": 600
      }}
    />
  );
}

export default function Basic() {
  const [renderAsLink, setRenderAsLink] = createSignal(false);

  return (
    <section
      style={{
        padding: "20px",
        border: "1px solid #e5e7eb",
        "border-radius": "16px",
        "background-color": "#fafafa",
        display: "grid",
        gap: "16px"
      }}
    >
      <div style={{ display: "grid", gap: "8px" }}>
        <strong>在线示例</strong>
        <span style={{ color: "#666" }}>
          通过切换 <code>as</code>，同一套业务属性可以渲染为不同元素。
        </span>
      </div>

      <label style={{ display: "inline-flex", "align-items": "center", gap: "8px" }}>
        <input
          type="checkbox"
          checked={renderAsLink()}
          onInput={(event) => setRenderAsLink(event.currentTarget.checked)}
        />
        渲染为链接
      </label>

      {/* 这里演示同一组件根据 as 的不同，输出 button 或自定义链接组件。 */}
      <Polymorphic
        as={renderAsLink() ? DemoLink : "button"}
        href={renderAsLink() ? "/floating" : undefined}
        type={renderAsLink() ? undefined : "button"}
        onClick={() => {
          if (!renderAsLink()) {
            window.alert("当前渲染的是 button 元素。");
          }
        }}
        style={{
          display: "inline-flex",
          "justify-content": "center",
          "align-items": "center",
          gap: "8px",
          width: "fit-content",
          padding: "10px 14px",
          border: "1px solid #1677ff",
          "border-radius": "10px",
          "background-color": renderAsLink() ? undefined : "#fff",
          color: renderAsLink() ? undefined : "#1677ff",
          "font-weight": 600,
          cursor: "pointer"
        }}
      >
        {renderAsLink() ? "跳转到 Floating 文档" : "普通按钮"}
      </Polymorphic>
    </section>
  );
}
