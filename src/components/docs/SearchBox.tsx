import { A, useLocation } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import { searchSitePages } from "../../docs";

export default function SearchBox() {
  const location = useLocation();
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal(false);
  let rootRef: HTMLDivElement | undefined;

  const results = createMemo(() => searchSitePages(query()).slice(0, 8));

  createEffect(() => {
    location.pathname;
    setOpen(false);
    setQuery("");
  });

  createEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  });

  return (
    <div ref={rootRef} class="search-box">
      <label class="search-input-shell">
        <span>Search</span>
        <input
          type="search"
          value={query()}
          placeholder="Search docs"
          onFocus={() => setOpen(true)}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setOpen(true);
          }}
        />
      </label>

      <Show when={open()}>
        <div class="search-panel">
          <Show
            when={query().trim().length > 0}
            fallback={<div class="search-empty">Search guide pages and component packages.</div>}
          >
            <Show
              when={results().length > 0}
              fallback={<div class="search-empty">No results for "{query().trim()}".</div>}
            >
              <For each={results()}>
                {(result) => (
                  <A class="search-result" href={result.href}>
                    <div class="search-result-top">
                      <strong>{result.title}</strong>
                      <span>{result.group === "guide" ? "Guide" : result.packageName}</span>
                    </div>
                    <p>{result.description}</p>
                  </A>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}
