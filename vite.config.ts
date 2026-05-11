import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";

import { solidStart } from "@solidjs/start/config";
import mdx from "@mdx-js/rollup";

export default defineConfig({
  resolve: {
    alias: [
      // {
      //   find: "@solidjs/router",
      //   // 这里直接指向磁盘文件，避免 Vite 再次按 package exports 解析到错误入口。
      //   replacement: fileURLToPath(
      //     new URL("./node_modules/@solidjs/router/dist/index.jsx", import.meta.url),
      //   )
      // }
    ]
  },
  plugins: [
    {
      ...mdx({
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "solid-mdx"
      }),
      enforce: "pre"
    },
    solidStart({
      extensions: ["mdx", "md"]
    }),
    nitro()
  ]
});
