import { createSignal } from "solid-js";

import DocsArticle, { type TocItem } from "../../components/docs/DocsArticle";
import DocsLayout, { PageHeader, PagePager } from "../../components/docs/DocsLayout";
import { sitePagesByHref } from "../../docs";

const page = sitePagesByHref.get("/guide")!;

export default function GuideRoute() {
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
          <h2 id="overview">Overview</h2>
          <p>
            This docs site is structured around package-level entry points. Each public package gets
            a focused page that explains when to use it, how to compose it, and what tradeoffs to
            expect when integrating it into an existing design system.
          </p>
        </section>

        <section>
          <h2 id="navigation-model">Navigation model</h2>
          <p>
            The left sidebar separates orientation content from package reference content. That keeps
            onboarding pages stable while allowing the component catalog to grow independently as new
            packages are added.
          </p>
        </section>

        <section>
          <h2 id="writing-style">Writing style</h2>
          <p>
            Package pages should stay pragmatic: a short description, one live example, the main API
            surface, and notes about semantics or implementation pitfalls. The goal is to make the
            docs scannable in the same way VueUse does for composables.
          </p>
        </section>
      </DocsArticle>
    </DocsLayout>
  );
}
