import { A } from "@solidjs/router";
import { For, createMemo, createSignal } from "solid-js";

import DocsArticle from "../components/docs/DocsArticle";
import DocsLayout, { PageHeader } from "../components/docs/DocsLayout";
import { componentPages, componentsIndexPage, searchSitePages } from "../docs";

export default function ComponentsRoute() {
  const [query, setQuery] = createSignal("");
  const filteredPages = createMemo(() => {
    const keyword = query().trim().toLowerCase();

    if (!keyword) {
      return componentPages;
    }

    return searchSitePages(keyword)
      .map((result) => componentPages.find((page) => page.href === result.href))
      .filter((page): page is (typeof componentPages)[number] => !!page);
  });

  return (
    <DocsLayout page={componentsIndexPage}>
      <PageHeader
        eyebrow="Catalog"
        title={componentsIndexPage.title}
        description={componentsIndexPage.description}
      />

      <DocsArticle>
        <section>
          <h2 id="browse-packages">Browse packages</h2>
          <p>
            This page mirrors the role VueUse&apos;s functions index plays: it is the fastest way
            to scan what exists, filter by intent, and jump into the relevant package page.
          </p>

          <label class="filter-box">
            <span>Filter packages</span>
            <input
              type="search"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search by name, capability or keyword"
            />
          </label>
        </section>

        <section>
          <h2 id="package-list">Package list</h2>
          <div class="package-grid">
            <For each={filteredPages()}>
              {(page) => (
                <A class="package-card" href={page.href}>
                  <div class="package-card-top">
                    <strong>{page.title}</strong>
                    <span>{page.packageName}</span>
                  </div>
                  <p>{page.description}</p>
                </A>
              )}
            </For>
          </div>
        </section>
      </DocsArticle>
    </DocsLayout>
  );
}
