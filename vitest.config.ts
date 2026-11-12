import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve workspace packages from source so tests do not require a prior
  // build. This alias is workspace-only; published packages never ship `src`.
  resolve: {
    alias: {
      "@universal-slots/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["{lib,packages}/**/src/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
