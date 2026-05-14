import { A } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  For,
  Show,
  splitProps,
  type JSX,
} from "solid-js";

type CalloutTone = "note" | "tip" | "warn";

type CalloutProps = {
  tone?: CalloutTone;
  title?: string;
  children: JSX.Element;
};

type DemoCardProps = {
  title?: string;
  description?: string;
  codeHref?: string;
  source?: {
    code: string;
    html: string;
    language?: string;
  };
  codeLanguage?: string;
  initiallyOpen?: boolean;
  children: JSX.Element;
};

type ApiTableColumn = {
  key: string;
  label: string;
};

type ApiTableRow = Record<string, JSX.Element>;

type ApiTableProps = {
  columns: ApiTableColumn[];
  rows: ApiTableRow[];
};

function getTextContent(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join("");
  }

  if (value && typeof value === "object" && "props" in value) {
    return getTextContent(
      (value as { props?: { children?: unknown } }).props?.children,
    );
  }

  return "";
}

export function CodeBlock(props: JSX.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const [local, others] = splitProps(props, ["children", "class"]);

  const source = createMemo(() => getTextContent(local.children).trim());

  const copy = async () => {
    if (!source()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(source());
      setCopied(true);
      clearTimeout(timer);
      timer = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div class="code-block">
      <button
        type="button"
        class="code-copy-button"
        onClick={() => void copy()}
      >
        {copied() ? "Copied" : "Copy"}
      </button>
      <pre class={`code-block-pre ${local.class ?? ""}`.trim()} {...others}>
        {local.children}
      </pre>
    </div>
  );
}

export function Callout(props: CalloutProps) {
  const merged = {
    tone: props.tone ?? "note",
    title:
      props.title ??
      (
        {
          note: "Note",
          tip: "Tip",
          warn: "Warning",
        } satisfies Record<CalloutTone, string>
      )[props.tone ?? "note"],
  };

  return (
    <aside
      classList={{ "callout-box": true, [`callout-${merged.tone}`]: true }}
    >
      <strong>{merged.title}</strong>
      <div>{props.children}</div>
    </aside>
  );
}

export function DemoCard(props: DemoCardProps) {
  const [showCode, setShowCode] = createSignal(!!props.initiallyOpen);
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const copySource = async () => {
    if (!props.source) {
      return;
    }

    try {
      await navigator.clipboard.writeText(props.source.code);
      setCopied(true);
      clearTimeout(timer);
      timer = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section class="demo-card">
      <div class="demo-card-header">
        <div>
          <h3>{props.title ?? "Demo"}</h3>
          <Show when={props.description}>
            {(description) => <p>{description()}</p>}
          </Show>
        </div>
        <div class="demo-card-actions">
          <Show when={props.source}>
            <button
              type="button"
              class="demo-card-button"
              onClick={() => setShowCode((open) => !open)}
            >
              {showCode() ? "Hide code" : "View code"}
            </button>
          </Show>
          <Show when={props.codeHref}>
            {(href) => (
              <a
                class="demo-card-link"
                href={href()}
                target="_blank"
                rel="noreferrer"
              >
                Open file
              </a>
            )}
          </Show>
        </div>
      </div>
      <div class="demo-card-body">{props.children}</div>
      <Show when={props.source && showCode()}>
        <div class="demo-card-code">
          <div class="code-block">
            <button
              type="button"
              class="code-copy-button"
              onClick={() => void copySource()}
            >
              {copied() ? "Copied" : "Copy"}
            </button>
            <div class="shiki-code" innerHTML={props.source!.html} />
          </div>
        </div>
      </Show>
    </section>
  );
}

export function ApiTable(props: ApiTableProps) {
  return (
    <div class="api-table-wrap">
      <table class="api-table">
        <thead>
          <tr>
            <For each={props.columns}>
              {(column) => <th>{column.label}</th>}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.rows}>
            {(row) => (
              <tr>
                <For each={props.columns}>
                  {(column) => <td>{row[column.key]}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
