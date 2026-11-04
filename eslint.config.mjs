import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// design-system may import only these packages (including their subpaths).
const DS_EXTERNAL_ALLOWLIST = [
  "react",
  "motion",
  "canvas-confetti",
  "lucide-react",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
];

const SUPABASE_RESTRICTION = {
  paths: [
    {
      name: "@supabase/supabase-js",
      message:
        "supabase-js는 src/core/supabase 와 src/features/*/data 에서만 import 해요.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-danger": "error",
      "no-restricted-imports": ["error", SUPABASE_RESTRICTION],
    },
  },
  {
    files: ["src/core/supabase/**", "src/features/*/data/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/test/**", "**/*.test.ts", "**/*.test.tsx"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
        node: true,
      },
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "features", pattern: "src/features/*", capture: ["name"] },
        { type: "core", pattern: "src/core/**" },
        { type: "ds", pattern: "src/design-system/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { types: ["features", "core", "ds"] } } },
            },
            {
              from: { element: { type: "features" } },
              allow: { to: { element: { types: ["core", "ds"] } } },
            },
            // A feature may import itself freely, and other features only
            // through their public index.
            {
              from: { element: { type: "features" } },
              allow: {
                to: {
                  element: {
                    type: "features",
                    captured: { name: "{{ from.element.captured.name }}" },
                  },
                },
              },
            },
            {
              from: { element: { type: "features" } },
              allow: {
                to: {
                  element: {
                    type: "features",
                    fileInternalPath: "index.{ts,tsx}",
                  },
                },
              },
            },
            {
              from: { element: { type: "core" } },
              allow: { to: { element: { type: "core" } } },
            },
            {
              from: { element: { type: "ds" } },
              allow: { to: { element: { type: "ds" } } },
            },
          ],
        },
      ],
    },
  },
  // design-system: local imports stay inside ds, external imports are limited
  // to the allowlist (package name, subpaths included).
  {
    files: ["src/design-system/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: "ds" } },
              allow: { to: { element: { type: "ds" } } },
            },
            {
              from: { element: { type: "ds" } },
              allow: {
                to: {
                  module: { origin: "external", source: DS_EXTERNAL_ALLOWLIST },
                },
              },
            },
          ],
        },
      ],
    },
  },
  // Reference copies of the design system are not project code. Edge Functions
  // are Deno code, checked by `npm run fn:check` (deno check/lint/test).
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
