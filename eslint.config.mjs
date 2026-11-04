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

const SUPABASE_MESSAGE =
  "supabase-js는 src/core/supabase 와 src/features/*/data 에서만 import 해요.";

const TUS_MESSAGE = "tus-js-client는 src/features/*/data 에서만 import 해요.";

const SUPABASE_RESTRICTION = {
  paths: [
    { name: "@supabase/supabase-js", message: SUPABASE_MESSAGE },
    { name: "tus-js-client", message: TUS_MESSAGE },
  ],
  patterns: [{ group: ["@supabase/supabase-js/*"], message: SUPABASE_MESSAGE }],
};

// Admin (원장) screens. Add new admin feature folders here.
const ADMIN_UI_FILES = [
  "src/app/admin/**",
  "src/features/admin-shell/**",
  "src/features/students/**",
  "src/features/classes/**",
  "src/features/sessions/**",
  "src/features/attendance/**",
  "src/features/points/**",
  "src/features/today/**",
  "src/features/videos/components/admin/**",
  "src/features/videos/screen/Admin*",
  "src/features/questions/components/admin/**",
  "src/features/questions/screen/Admin*",
  "src/features/guardian/components/admin/**",
];

const ENTRANCE_MOTION = [
  "Reveal",
  "RevealGroup",
  "TextRise",
  "LeafDraw",
  "CountUp",
  "PointsBurst",
  "ProgressFill",
  "celebrate",
];

const NO_ENTRANCE_MOTION_MESSAGE =
  "원장 화면에는 등장 모션을 쓰지 않아요(디자인 시스템 README 모션).";

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
    files: ADMIN_UI_FILES,
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/design-system",
              importNames: ENTRANCE_MOTION,
              message: NO_ENTRANCE_MOTION_MESSAGE,
            },
          ],
          patterns: [
            {
              group: ["@/design-system/motion", "@/design-system/motion/*"],
              message: NO_ENTRANCE_MOTION_MESSAGE,
            },
          ],
        },
      ],
    },
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
  // Plain service worker script (no bundler): browser worker globals.
  {
    files: ["public/sw.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        Response: "readonly",
        URL: "readonly",
      },
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
