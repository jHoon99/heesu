import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("design tokens", () => {
  it.each([
    "--brown-700: #7A4E2E;",
    "--bg-page: var(--beige);",
    "--color-*: initial;",
    "--spacing: 4px;",
  ])("contains %s", (token) => {
    expect(css.toLowerCase()).toContain(token.toLowerCase());
  });

  it("has no external font CSS import (CSP)", () => {
    expect(css).not.toContain("fonts.googleapis.com");
  });

  it("uses the dynamic-subset Pretendard family, not a next/font variable", () => {
    expect(css).toMatch(/--font-sans:\s*"Pretendard Variable",/);
    expect(css).not.toContain("--font-pretendard");
  });
});
