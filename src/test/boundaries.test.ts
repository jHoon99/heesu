import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { ESLint } from "eslint";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint();

async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.severity === 2) ?? [];
}

async function lintAll(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages ?? [];
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
    expect(errors[0]?.ruleId).toBe("boundaries/dependencies");
  });

  it("forbids reaching into another feature's internals", async () => {
    const errors = await lint(
      "src/features/a/screen/x.tsx",
      'import "@/features/zz-fixture/data/y";\n',
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.ruleId).toBe("boundaries/dependencies");
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
    expect(errors[0]?.ruleId).toBe("no-restricted-imports");
  });

  it("forbids supabase-js subpaths outside data", async () => {
    const errors = await lint(
      "src/app/x.tsx",
      'import "@supabase/supabase-js/dist/module/index.js";\n',
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.ruleId).toBe("no-restricted-imports");
  });

  it("allows supabase-js in feature data and core/supabase", async () => {
    const code =
      'import { createClient } from "@supabase/supabase-js";\nexport const c = createClient;\n';
    expect(await lint("src/features/zz-fixture/data/x.ts", code)).toHaveLength(
      0,
    );
    expect(await lint("src/core/supabase/x.ts", code)).toHaveLength(0);
  });

  it("warns when admin UI imports entrance motion", async () => {
    const reveal =
      'import { Reveal } from "@/design-system";\nexport const r = Reveal;\n';
    const warnings = (
      await lintAll("src/features/students/screen/x.tsx", reveal)
    ).filter((m) => m.severity === 1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.ruleId).toBe(
      "@typescript-eslint/no-restricted-imports",
    );

    const button =
      'import { Button } from "@/design-system";\nexport const b = Button;\n';
    expect(
      (await lintAll("src/features/students/screen/x.tsx", button)).filter(
        (m) => m.severity === 1,
      ),
    ).toHaveLength(0);

    expect(
      (await lintAll("src/features/landing/screen/x.tsx", reveal)).filter(
        (m) => m.severity === 1,
      ),
    ).toHaveLength(0);
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
