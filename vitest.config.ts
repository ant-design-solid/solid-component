import { defineConfig } from "vitest/config";
import path, { resolve } from "node:path";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ hot: !process.env.VITEST })],
  resolve: {
    alias: {
      "@solid-component/utils": path.resolve(import.meta.dirname, "packages/utils/src"),
      "@solid-component/motion": path.resolve(import.meta.dirname, "packages/motion/src"),
      "@solid-component/polymorphic": path.resolve(import.meta.dirname, "packages/polymorphic/src"),
      // // Vitest 在 Node 条件下会优先命中部分依赖的 CJS 导出，需显式固定到 ESM 入口，避免加载第二份 Solid 运行时。
      // "@s-primitives/shared": path.resolve(
      //   import.meta.dirname,
      //   "node_modules/@s-primitives/shared/dist/index.js",
      // ),
      // "@s-primitives/web": path.resolve(import.meta.dirname, "node_modules/@s-primitives/web/dist/index.js"),
    },
    dedupe: ["solid-js"],
  },
  cacheDir: resolve(import.meta.dirname, "node_modules/.vite"),
  test: {
    reporters: "dot",
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      include: ["packages/**/*.{ts,tsx}"],
      exclude: ["**/.test/**", "**/dist/**", "**/types.ts", "**/*.config.{ts,tsx}"],
    },
    projects: [
      "packages/*/vitest.config.ts",
      {
        extends: "./vitest.config.ts",
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: [resolve(import.meta.dirname, "packages/.test/setup.ts")],
          include: ["packages/**/*.{test,spec}.{ts,tsx}", "test/*.{test,spec}.{ts,tsx}"],
          exclude: ["packages/**/*.{browser,server}.{test,spec}.{ts,tsx}"],
          server: {
            deps: {
              inline: ["solid-js", "@solid-primitive/shared", "@solid-primitive/web"],
            },
          },
        },
      },
    ],
  },
});
