import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

import mdx from "@mdx-js/rollup";
import { solidStart } from "@solidjs/start/config";
import rehypePrettyCode from "rehype-pretty-code";

import {
  getCodeTheme,
  highlightCodeToHtml,
  normalizeCodeLanguage,
} from "./src/lib/code-highlight";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@mdx-runtime",
        replacement: fileURLToPath(
          new URL("./src/lib/mdx.tsx", import.meta.url),
        ),
      },
      {
        find: /^@solid-component\/([^/]+)$/,
        replacement: join(
          fileURLToPath(new URL("./packages", import.meta.url)),
          "$1",
          "src",
        ),
      },
    ],
  },
  plugins: [
    {
      name: "docs-code-preview",
      async load(id) {
        const [filepath, query] = id.split("?", 2);

        if (query !== "code") {
          return null;
        }

        const source = await readFile(filepath, "utf8");
        const extension = filepath.split(".").pop();
        const language = normalizeCodeLanguage(extension);
        const html = await highlightCodeToHtml(source, language);

        return `export default ${JSON.stringify({
          code: source,
          html,
          language,
        })};`;
      },
    },
    {
      ...mdx({
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "@mdx-runtime",
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: getCodeTheme(),
              keepBackground: false,
              defaultLang: "tsx",
            },
          ],
        ],
      }),
      enforce: "pre",
    },
    solidStart({
      extensions: ["mdx", "md"],
    }),
    nitro(),
  ],
});
