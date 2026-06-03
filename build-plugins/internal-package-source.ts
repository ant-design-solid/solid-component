import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";

const packageSourceRoot = fileURLToPath(
  new URL("../packages", import.meta.url),
).replace(/\\/g, "/");

export function internalPackageSource(): Plugin {
  return {
    name: "internal-package-source",
    enforce: "pre",
    resolveId(source) {
      const match = source.match(/^@solid-component\/([^/]+)$/);

      if (!match) {
        return null;
      }

      for (const entry of ["index.tsx", "index.ts"]) {
        const filepath = join(packageSourceRoot, match[1]!, "src", entry);

        if (existsSync(filepath)) {
          return filepath;
        }
      }

      return null;
    },
  };
}
