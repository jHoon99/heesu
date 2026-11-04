import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    // boundaries.test.ts creates and deletes zz-fixture paths concurrently.
    if (name.includes("zz-fixture")) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("screen code uses tokens only", () => {
  const root = process.cwd();
  const files = [
    ...walk(join(root, "src/features")).filter((f) => /\.tsx?$/.test(f)),
    ...walk(join(root, "src/app")).filter((f) => /\.tsx$/.test(f)),
  ].filter((f) => !/\.test\.tsx?$/.test(f));

  it("scans some files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.slice(root.length + 1), f]))(
    "%s has no hex or rgb() colors",
    (_name, file) => {
      expect(readFileSync(file, "utf8")).not.toMatch(RAW_COLOR);
    },
  );
});
