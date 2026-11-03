import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { metadata as privacyMetadata } from "@/app/(landing)/privacy/page";

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
        "Disallow: /g$",
        "Disallow: /g/",
        "",
        "Sitemap: https://heesu.pages.dev/sitemap.xml",
        "",
      ].join("\n"),
    );
  });

  it("sitemap.xml lists only the landing page (/privacy stays out until legal review)", () => {
    const locs = [
      ...read("public/sitemap.xml")
        .toString("utf8")
        .matchAll(/<loc>([^<]*)<\/loc>/g),
    ].map((m) => m[1]);
    expect(locs).toEqual(["https://heesu.pages.dev/"]);
  });

  it("/privacy is noindex until legal review", () => {
    expect(privacyMetadata.robots).toEqual({ index: false, follow: true });
  });

  it("og.png is a 1200x1200 PNG", () => {
    const png = read("public/og.png");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(1200);
  });
});
