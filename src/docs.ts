import type { Component } from "solid-js";

type MdxModule = {
  default: Component;
};

export type DocPage = {
  title: string;
  href: string;
  Component: Component;
};

const modules = import.meta.glob<MdxModule>("../packages/*/docs/**/*.mdx", {
  eager: true
});

const docs = Object.entries(modules).map(([path, mod]) => {
  const match = path.match(/^..\/packages\/([^/]+)\/docs\/(.+)\.mdx$/);

  if (!match) {
    throw new Error(`Unexpected doc path: ${path}`);
  }

  const [, packageName, docPath] = match;
  const slug = docPath === "index" ? "" : docPath.replace(/\/index$/, "");
  const href = slug ? `/${packageName}/${slug}` : `/${packageName}`;

  return {
    title: packageName,
    href,
    Component: mod.default
  };
});

export const docPages = docs.sort((a, b) => a.href.localeCompare(b.href));

export const docsByHref = new Map(docPages.map((page) => [page.href, page]));
