import type { Component, JSX } from "solid-js";

type MDXRenderable =
  | keyof JSX.IntrinsicElements
  | Component<any>
  | ((props: any) => JSX.Element);

type MDXComponents = Record<string, MDXRenderable>;

declare module "*.mdx" {
  const Comp: Component<{
    components?: MDXComponents;
    children?: JSX.Element;
  }>;
  export default Comp;
}

declare module "*.md" {
  const Comp: Component<{
    components?: MDXComponents;
    children?: JSX.Element;
  }>;
  export default Comp;
}

declare module "*.markdown" {
  const Comp: Component<{
    components?: MDXComponents;
    children?: JSX.Element;
  }>;
  export default Comp;
}

declare module "*?code" {
  const source: {
    code: string;
    html: string;
    language?: string;
  };
  export default source;
}

export {};
