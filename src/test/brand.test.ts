import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("heesu-logo.svg", () => {
  const svg = readFileSync(
    join(process.cwd(), "public/brand/heesu-logo.svg"),
    "utf8",
  );
  const viewBox = /<svg[^>]*\sviewBox="([^"]+)"/.exec(svg)?.[1] ?? "";
  const [, , w = 0, h = 1] = viewBox.split(/\s+/).map(Number);

  it("is cropped to the ink area, not the 5344 square canvas", () => {
    expect(viewBox).not.toBe("0 0 5344 5344");
  });

  it("keeps a sensible aspect ratio", () => {
    const ratio = w / h;
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(1.4);
  });
});
