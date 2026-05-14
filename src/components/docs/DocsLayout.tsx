import { A } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";

import { getPrevNextPage, navGroups, type SitePage } from "../../docs";
import type { TocItem } from "./DocsArticle";
import SearchBox from "./SearchBox";

type DocsLayoutProps = {
  page?: SitePage;
  toc?: TocItem[];
  activeHeadingId?: string;
  sidebar?: boolean;
  children: JSX.Element;
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: JSX.Element;
};

export function PageHeader(props: PageHeaderProps) {
  return (
    <header class="page-header">
      <Show when={props.eyebrow}>
        {(eyebrow) => <div class="page-eyebrow">{eyebrow()}</div>}
      </Show>
      <h1>{props.title}</h1>
      <p>{props.description}</p>
      <Show when={props.actions}>
        <div class="page-actions">{props.actions}</div>
      </Show>
    </header>
  );
}

export function PagePager(props: { href: string }) {
  const { prev, next } = getPrevNextPage(props.href);

  return (
    <Show when={prev || next}>
      <nav class="page-pager" aria-label="Page navigation">
        <Show when={prev}>
          {(page) => (
            <A class="pager-card" href={page().href}>
              <span>Previous</span>
              <strong>{page().title}</strong>
            </A>
          )}
        </Show>
        <Show when={next}>
          {(page) => (
            <A class="pager-card" href={page().href}>
              <span>Next</span>
              <strong>{page().title}</strong>
            </A>
          )}
        </Show>
      </nav>
    </Show>
  );
}

export default function DocsLayout(props: DocsLayoutProps) {
  return (
    <div class="site-shell">
      <header class="site-topbar">
        <div class="site-topbar-inner">
          <A class="site-brand" href="/">
            <span class="site-brand-mark">SC</span>
            <span>
              <strong>Solid Components</strong>
              <small>Composable Solid UI primitives</small>
            </span>
          </A>

          <div class="site-topbar-tools">
            <SearchBox />

            <nav class="site-topnav" aria-label="Primary">
              <A href="/guide" activeClass="active">
                Guide
              </A>
              <A href="/components" activeClass="active">
                Components
              </A>
              <a
                href="https://github.com/ant-design-solid/solid-components"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div classList={{ "site-frame": true, "site-frame-no-sidebar": props.sidebar === false }}>
        <Show when={props.sidebar !== false}>
          <aside class="site-sidebar">
            <For each={navGroups}>
              {(group) => (
                <section class="nav-group">
                  <h2>{group.title}</h2>
                  <nav>
                    <For each={group.items}>
                      {(item) => (
                        <A href={item.href} activeClass="active" end>
                          <span>{item.title}</span>
                          <Show when={item.kind === "component"}>
                            <small>{item.packageName}</small>
                          </Show>
                        </A>
                      )}
                    </For>
                  </nav>
                </section>
              )}
            </For>
          </aside>
        </Show>

        <main class="site-main">
          <div class="site-content">{props.children}</div>
        </main>

        <Show when={props.toc && props.toc.length > 0}>
          <aside class="site-toc">
            <div class="toc-card">
              <span>On this page</span>
              <nav>
                <For each={props.toc}>
                  {(item) => (
                    <a
                      href={`#${item.id}`}
                      classList={{
                        active: props.activeHeadingId === item.id,
                        "toc-subitem": item.level === 3,
                      }}
                    >
                      {item.text}
                    </a>
                  )}
                </For>
              </nav>
            </div>
          </aside>
        </Show>
      </div>
    </div>
  );
}
