import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{lib,packages}/**/src/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
