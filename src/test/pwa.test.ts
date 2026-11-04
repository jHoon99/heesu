import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { metadata, viewport } from "@/app/s/layout";
import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "@/core/pwa";

const read = (p: string) => readFileSync(join(process.cwd(), p));
const manifest = JSON.parse(read("public/manifest.webmanifest").toString());

function expectPng(path: string, size: number) {
  const png = read(path);
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(size);
  expect(png.readUInt32BE(20)).toBe(size);
}

describe("manifest.webmanifest", () => {
  it("names and launches the student app", () => {
    expect(manifest.name).toBe("희수영어");
    expect(manifest.short_name).toBe("희수영어");
    expect(manifest.start_url).toBe("/s");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("colors equal the --beige token", () => {
    const css = read("src/app/globals.css").toString();
    const beige = /--beige:\s*(#[0-9a-fA-F]{6})/.exec(css)![1]!.toLowerCase();
    expect(PWA_THEME_COLOR).toBe(beige);
    expect(PWA_BACKGROUND_COLOR).toBe(beige);
    expect(manifest.theme_color.toLowerCase()).toBe(beige);
    expect(manifest.background_color.toLowerCase()).toBe(beige);
  });

  it("has a maskable icon and every icon file matches its size", () => {
    expect(
      manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable"),
    ).toBe(true);
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      expectPng(`public${icon.src}`, Number(icon.sizes.split("x")[0]));
    }
  });

  it("apple-touch-icon is 180x180", () => {
    expectPng("public/apple-touch-icon.png", 180);
  });
});

describe("/s layout pwa metadata", () => {
  it("links the manifest and sets theme/viewport for the student app only", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.robots).toEqual({ index: false });
    expect(viewport.themeColor).toBe(PWA_THEME_COLOR);
    expect(viewport.viewportFit).toBe("cover");
  });

  it("no app file outside src/app/s wires the manifest or service worker", () => {
    const tsFiles = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return tsFiles(p);
        return /\.tsx?$/.test(e.name) ? [p] : [];
      });
    const files = tsFiles(join(process.cwd(), "src/app")).map((p) =>
      relative(process.cwd(), p).split(sep).join("/"),
    );
    expect(files.length).toBeGreaterThan(5);
    const outside = files.filter((p) => !p.startsWith("src/app/s/"));
    for (const p of outside) {
      expect(read(p).toString(), p).not.toMatch(
        /manifest\.webmanifest|registerServiceWorker/,
      );
    }
  });
});
