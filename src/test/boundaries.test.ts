import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { ESLint } from "eslint";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint();

async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.severity === 2) ?? [];
}

// The boundaries plugin only classifies imports that resolve to real files,
// so the tests create throwaway fixture modules next to the real source dirs.
const FIXTURE_CORE = "src/core/zz-fixture.ts";
const FIXTURE_FEATURE = "src/features/zz-fixture";

describe("architecture boundaries", { timeout: 20_000 }, () => {
  beforeAll(() => {
    mkdirSync(`${FIXTURE_FEATURE}/data`, { recursive: true });
    writeFileSync(FIXTURE_CORE, "export const x = 1;\n");
    writeFileSync(`${FIXTURE_FEATURE}/index.ts`, "export const x = 1;\n");
    writeFileSync(`${FIXTURE_FEATURE}/data/y.ts`, "export const y = 1;\n");
  });

  afterAll(() => {
    rmSync(FIXTURE_CORE, { force: true });
    rmSync(FIXTURE_FEATURE, { recursive: true, force: true });
  });

  it("forbids design-system from importing core", async () => {
    const errors = await lint(
      "src/design-system/x.ts",
      'import "@/core/zz-fixture";\n',
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("forbids reaching into another feature's internals", async () => {
    const errors = await lint(
      "src/features/a/screen/x.tsx",
      'import "@/features/zz-fixture/data/y";\n',
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("allows importing another feature's public entry", async () => {
    const errors = await lint(
      "src/features/a/screen/x.tsx",
      'import "@/features/zz-fixture";\n',
    );
    expect(errors).toHaveLength(0);
  });

  it("allows a feature to import its own internals", async () => {
    const errors = await lint(
      "src/features/zz-fixture/screen/x.tsx",
      'import "@/features/zz-fixture/data/y";\n',
    );
    expect(errors).toHaveLength(0);
  });

  it("forbids supabase-js outside core/supabase and feature data", async () => {
    const errors = await lint(
      "src/app/x.tsx",
      'import { createClient } from "@supabase/supabase-js";\nexport const c = createClient;\n',
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("forbids design-system from importing non-allowlisted packages", async () => {
    const errors = await lint(
      "src/design-system/x.ts",
      'import { z } from "zod";\nexport const s = z;\n',
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("allows design-system allowlisted packages incl. subpaths", async () => {
    const errors = await lint(
      "src/design-system/x.ts",
      'import { motion } from "motion/react";\nimport { jsx } from "react/jsx-runtime";\nexport const a = [motion, jsx];\n',
    );
    expect(errors).toHaveLength(0);
  });
});
