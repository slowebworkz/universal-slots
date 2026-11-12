import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["**/dist/**", "**/coverage/**", "**/node_modules/**"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // Node-run repository scripts.
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports" },
      ],
      // Keep type imports/exports in their own statements, apart from value ones.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportSpecifier[importKind='type']",
          message:
            "Use a separate `import type { ... }` statement instead of an inline `type` specifier.",
        },
        {
          selector: "ExportSpecifier[exportKind='type']",
          message:
            "Use a separate `export type { ... }` statement instead of an inline `type` specifier.",
        },
      ],
    },
  },
);
