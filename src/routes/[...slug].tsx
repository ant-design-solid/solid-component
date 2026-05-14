import { useLocation } from "@solidjs/router";
import { createMemo, createSignal, Show } from "solid-js";

import DocsArticle, { type TocItem } from "../components/docs/DocsArticle";
import DocsLayout, {
  PageHeader,
  PagePager,
} from "../components/docs/DocsLayout";
import { mdxComponents } from "../components/docs/mdx-components";
import { docsByHref } from "../docs";

export default function DocsRoute() {
  const location = useLocation();
  const [toc, setToc] = createSignal<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = createSignal<string>();
  const currentPage = createMemo(() => docsByHref.get(location.pathname));

  return (
    <DocsLayout
      page={currentPage()}
      toc={toc()}
      activeHeadingId={activeHeadingId()}
    >
      <Show
        when={currentPage()}
        fallback={
          <div class="page-state">
            <h1>Page not found</h1>
            <p>No documentation page exists for this path.</p>
          </div>
        }
      >
        {(currentPage) => {
          const page = currentPage();
          const PageComponent = page.Component!;

          return (
            <>
              <PageHeader
                eyebrow="Component"
                title={page.title}
                description={page.description}
              />

              <DocsArticle
                mdx
                onTocChange={setToc}
                onActiveHeadingChange={setActiveHeadingId}
                footer={<PagePager href={page.href} />}
              >
                <PageComponent components={mdxComponents} />
              </DocsArticle>
            </>
          );
        }}
      </Show>
    </DocsLayout>
  );
}
