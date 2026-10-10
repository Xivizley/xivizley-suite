import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/*.config.{js,mjs,cjs,ts}",
      "scripts/**",
      "**/*.log",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Turkish/English UI copy uses apostrophes in JSX text; not a real hazard.
      "react/no-unescaped-entities": "off",
      // App Router only — no pages/ directory.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
