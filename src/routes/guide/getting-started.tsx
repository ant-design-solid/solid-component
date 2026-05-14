import { createSignal } from "solid-js";

import DocsArticle, { type TocItem } from "../../components/docs/DocsArticle";
import DocsLayout, { PageHeader, PagePager } from "../../components/docs/DocsLayout";
import { sitePagesByHref } from "../../docs";

const page = sitePagesByHref.get("/guide/getting-started")!;

export default function GettingStartedRoute() {
  const [toc, setToc] = createSignal<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = createSignal<string>();

  return (
    <DocsLayout page={page} toc={toc()} activeHeadingId={activeHeadingId()}>
      <PageHeader eyebrow="Guide" title={page.title} description={page.description} />

      <DocsArticle
        onTocChange={setToc}
        onActiveHeadingChange={setActiveHeadingId}
        footer={<PagePager href={page.href} />}
      >
        <section>
          <h2 id="installation">Installation</h2>
          <pre>
            <code>pnpm add @s-components/floating @s-components/motion solid-js</code>
          </pre>
          <p>
            Install only the packages you need. The library is organized as a workspace of small
            packages rather than a single all-in-one bundle.
          </p>
        </section>

        <section>
          <h2 id="local-docs">Run the docs locally</h2>
          <pre>
            <code>pnpm dev</code>
          </pre>
          <p>
            The docs app is powered by SolidStart and MDX. Package docs are discovered from
            `packages/*/docs/**/*.mdx`, so new package pages become available without manual route
            registration.
          </p>
        </section>

        <section>
          <h2 id="doc-conventions">Documentation conventions</h2>
          <p>
            Every package entry page exports a small `meta` object for navigation title,
            description and search keywords. That keeps the docs data model explicit without adding
            frontmatter parsing to the build pipeline.
          </p>
        </section>
      </DocsArticle>
    </DocsLayout>
  );
}
