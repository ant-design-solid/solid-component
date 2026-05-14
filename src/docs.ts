import type { Component, JSX } from "solid-js";
import type { MDXComponents } from "./lib/mdx";

import { generatedPackageApi } from "./generated/package-api";

export type DocGroup = "guide" | "components";
export type DocKind = "guide" | "index" | "component";
export type SymbolKind = "component" | "hook" | "function" | "type";

export type DocMeta = {
  title?: string;
  description?: string;
  summary?: string;
  order?: number;
  keywords?: string[];
};

type MdxModule = {
  default: Component<{
    components?: MDXComponents;
    children?: JSX.Element;
  }>;
  meta?: DocMeta;
};

export type SitePage = {
  title: string;
  description: string;
  summary?: string;
  href: string;
  group: DocGroup;
  kind: DocKind;
  order: number;
  keywords: string[];
  packageName?: string;
  Component?: MdxModule["default"];
};

export type SearchResult = {
  title: string;
  description: string;
  href: string;
  group: DocGroup;
  kind: DocKind;
  packageName?: string;
  score: number;
};

export type PackageApiItem = {
  name: string;
  kind: SymbolKind;
  description?: string;
  source: string;
};

export type NavGroup = {
  title: string;
  items: SitePage[];
};

const docModules = import.meta.glob<MdxModule>("../packages/*/docs/**/*.mdx", {
  eager: true,
});

const guidePages: SitePage[] = [
  {
    title: "Introduction",
    description:
      "What Solid Components is, how the packages are organized, and how to navigate the docs.",
    href: "/guide",
    group: "guide",
    kind: "guide",
    order: 0,
    keywords: ["overview", "guide", "introduction"],
  },
  {
    title: "Getting Started",
    description:
      "Install packages, wire the docs dev server, and learn the conventions used across the library.",
    href: "/guide/getting-started",
    group: "guide",
    kind: "guide",
    order: 10,
    keywords: ["install", "usage", "getting started"],
  },
];

export const componentsIndexPage: SitePage = {
  title: "Components",
  description:
    "Browse the current packages, filter by capability, and jump into the component-specific documentation.",
  href: "/components",
  group: "components",
  kind: "index",
  order: 0,
  keywords: ["components", "packages", "catalog"],
};

function titleFromPackageName(packageName: string) {
  return packageName
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

const packagePages = Object.entries(docModules)
  .map(([path, mod]) => {
    const match = path.match(/^..\/packages\/([^/]+)\/docs\/(.+)\.mdx$/);

    if (!match) {
      throw new Error(`Unexpected doc path: ${path}`);
    }

    const [, packageName, docPath] = match;
    const slug = docPath === "index" ? "" : docPath.replace(/\/index$/, "");
    const href = slug ? `/${packageName}/${slug}` : `/${packageName}`;

    return {
      title: mod.meta?.title || titleFromPackageName(packageName),
      description: mod.meta?.description || "",
      summary: mod.meta?.summary,
      href,
      group: "components" as const,
      kind: "component" as const,
      order: mod.meta?.order ?? Number.MAX_SAFE_INTEGER,
      keywords: mod.meta?.keywords ?? [],
      packageName,
      Component: mod.default,
    } as SitePage;
  })
  .sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.href.localeCompare(b.href);
  });

export const componentPages = packagePages;
export const docsByHref = new Map(componentPages.map((page) => [page.href, page] as const));
export const packageApiByName = new Map<string, PackageApiItem[]>(
  Object.entries(generatedPackageApi),
);

export const sitePages = [...guidePages, componentsIndexPage, ...componentPages];

export const sitePagesByHref = new Map(
  sitePages.map((page) => [page.href, page] as const),
);

export const navGroups: NavGroup[] = [
  {
    title: "Guide",
    items: guidePages,
  },
  {
    title: "Components",
    items: [componentsIndexPage, ...componentPages],
  },
];

export function searchSitePages(query: string) {
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return [];
  }

  return sitePages
    .filter((page) => page.href !== "/")
    .map((page) => {
      const fields = [
        page.title,
        page.description,
        page.summary || "",
        page.packageName || "",
        ...page.keywords,
      ].map((field) => field.toLowerCase());

      let score = 0;

      if (fields[0] && fields[0].includes(keyword)) score += 6;
      if (fields[1] && fields[1].includes(keyword)) score += 4;
      if (fields[2] && fields[2].includes(keyword)) score += 3;
      if (fields[3] && fields[3].includes(keyword)) score += 2;

      for (const value of fields.slice(4)) {
        if (value.includes(keyword)) score += 1;
      }

      return {
        title: page.title,
        description: page.description,
        href: page.href,
        group: page.group,
        kind: page.kind,
        packageName: page.packageName,
        score,
      } as SearchResult;
    })
    .filter((page) => page.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return a.title.localeCompare(b.title);
    });
}

export function getPrevNextPage(href: string) {
  const index = sitePages.findIndex((page) => page.href === href);

  if (index === -1) {
    return {
      prev: undefined,
      next: undefined,
    };
  }

  return {
    prev: index > 0 ? sitePages[index - 1] : undefined,
    next: index < sitePages.length - 1 ? sitePages[index + 1] : undefined,
  };
}
