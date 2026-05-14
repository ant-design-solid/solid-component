import {
  createEffect,
  mergeProps,
  on,
  type JSX,
} from "solid-js";
import { useLocation } from "@solidjs/router";

export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

type DocsArticleProps = {
  children: JSX.Element;
  mdx?: boolean;
  footer?: JSX.Element;
  onTocChange?: (items: TocItem[]) => void;
  onActiveHeadingChange?: (id: string | undefined) => void;
};

function collectToc(root: HTMLElement | undefined): TocItem[] {
  if (!root) {
    return [];
  }

  return Array.from(root.querySelectorAll<HTMLElement>("h2[id], h3[id]"))
    .map((heading) => {
      const level = Number(heading.tagName.slice(1)) as 2 | 3;
      return {
        id: heading.id,
        text: heading.textContent?.trim() ?? "",
        level,
      };
    })
    .filter((item) => item.text.length > 0);
}

export default function DocsArticle(props: DocsArticleProps) {
  const merged = mergeProps({ mdx: false }, props);
  const location = useLocation();
  let articleRef: HTMLElement | undefined;

  const syncToc = () => {
    props.onTocChange?.(collectToc(articleRef));
  };

  const syncActiveHeading = () => {
    if (!articleRef) {
      props.onActiveHeadingChange?.(undefined);
      return;
    }

    const headings = Array.from(
      articleRef.querySelectorAll<HTMLElement>("h2[id], h3[id]"),
    );

    const current =
      headings.findLast((heading) => heading.getBoundingClientRect().top <= 140) ?? headings[0];

    props.onActiveHeadingChange?.(current?.id);
  };

  createEffect(
    on(
      () => location.pathname,
      () => {
        queueMicrotask(syncToc);
        queueMicrotask(syncActiveHeading);
      },
      { defer: false },
    ),
  );

  createEffect(() => {
    props.children;
    queueMicrotask(syncToc);
    queueMicrotask(syncActiveHeading);
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onScroll = () => syncActiveHeading();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });

  return (
    <>
      <article ref={articleRef} class="docs-prose">
        {merged.children}
      </article>
      {merged.footer}
    </>
  );
}
