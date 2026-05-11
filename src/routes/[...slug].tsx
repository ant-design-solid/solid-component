import { A, useLocation } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

import { docPages, docsByHref } from "../docs";

export default function DocsRoute() {
  const location = useLocation();
  const currentPage = createMemo(() => {
    const path = location.pathname === "/" ? docPages[0]?.href : location.pathname;
    return docsByHref.get(path);
  });

  return (
    <div class="docs-layout">
      <aside class="docs-sidebar">
        <a class="docs-brand" href="/">
          Solid Components
        </a>
        <nav class="docs-nav">
          <For each={docPages}>
            {(page) => (
              <A href={page.href} activeClass="active">
                {page.title}
              </A>
            )}
          </For>
        </nav>
      </aside>

      <main class="docs-content">
        <Show
          when={currentPage()}
          fallback={
            <section>
              <h1>Page not found</h1>
              <p>No documentation page exists for this path.</p>
            </section>
          }
        >
          {(page) => <Dynamic component={page().Component} />}
        </Show>
      </main>
    </div>
  );
}
