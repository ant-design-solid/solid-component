import { resolve } from "node:path";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { internalPackageSource } from "./build-plugins/internal-package-source";

export default defineConfig({
  plugins: [internalPackageSource(), solid({ hot: !process.env.VITEST })],
  resolve: {
    alias: {},
    dedupe: ["solid-js"],
  },
  cacheDir: resolve(import.meta.dirname, "node_modules/.vite"),
  test: {
    reporters: "dot",
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      include: ["packages/**/*.{ts,tsx}"],
      exclude: [
        "**/.test/**",
        "**/dist/**",
        "**/types.ts",
        "**/*.config.{ts,tsx}",
      ],
    },
    projects: [
      "packages/*/vitest.config.ts",
      {
        extends: "./vitest.config.ts",
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: [resolve(import.meta.dirname, "packages/.test/setup.ts")],
          include: [
            "packages/**/*.{test,spec}.{ts,tsx}",
            "test/*.{test,spec}.{ts,tsx}",
          ],
          exclude: ["packages/**/*.{browser,server}.{test,spec}.{ts,tsx}"],
          server: {
            deps: {
              inline: [
                "solid-js",
                "@solid-primitive/shared",
                "@solid-primitive/web",
              ],
            },
          },
        },
      },
    ],
  },
});
