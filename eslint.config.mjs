import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    "types/database.types.ts",
    "tmp_rewrite.js",
    "e2e/**",
    "forensics/**",
    ".vercel/**",
    ".turbo/**",
    "scripts/tmp/**/*.log",
    "scripts/tmp/qa-*/**",
    "scripts/tmp/qa-*",
    "scripts/tmp/*-results.json",
    "scripts/tmp/smoke-auth*",
    "lib/generated/prisma/**",
    "**/*.tsbuildinfo",
  ]),
  {
    rules: {
      // Legacy codebase: keep lint actionable without blocking release on pre-existing debt.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/error-boundaries": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
