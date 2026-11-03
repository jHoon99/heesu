import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p));

describe("public SEO files", () => {
  it("robots.txt keeps /sitemap.xml crawlable while blocking /s, /g, /admin", () => {
    expect(read("public/robots.txt").toString("utf8")).toBe(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /s$",
        "Disallow: /s/",
        "Disallow: /g",
        "",
        "Sitemap: https://heesu.pages.dev/sitemap.xml",
        "",
      ].join("\n"),
    );
  });

  it("sitemap.xml lists exactly the two public pages", () => {
    const locs = [
      ...read("public/sitemap.xml")
        .toString("utf8")
        .matchAll(/<loc>([^<]*)<\/loc>/g),
    ].map((m) => m[1]);
    expect(locs).toEqual([
      "https://heesu.pages.dev/",
      "https://heesu.pages.dev/privacy",
    ]);
  });

  it("og.png is a 1200x1200 PNG", () => {
    const png = read("public/og.png");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(1200);
  });
});
