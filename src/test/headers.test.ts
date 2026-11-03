import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REF = "pudxtxzcftehxicfthmf";
const raw = readFileSync(join(process.cwd(), "public/_headers"), "utf8");

// Cloudflare Pages _headers: an unindented path line, then indented "Name: value" lines.
function block(path: string): string[] {
  const lines = raw.split("\n");
  const start = lines.findIndex((l) => l.trim() === path && !/^\s/.test(l));
  if (start === -1) return [];
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(l)) break;
    out.push(l.trim());
  }
  return out;
}

const all = block("/*");
const csp = all.find((l) => l.startsWith("Content-Security-Policy:")) ?? "";

describe("public/_headers /*", () => {
  it.each([
    "default-src 'self'",
    `connect-src 'self' https://${REF}.supabase.co wss://${REF}.supabase.co https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: blob: https://${REF}.supabase.co`,
    `media-src https://${REF}.supabase.co blob:`,
    "frame-src https://challenges.cloudflare.com",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ])("CSP contains %s", (directive) => {
    expect(csp).toContain(directive);
  });

  it("frame-src allows only Turnstile (no map iframe)", () => {
    const frameSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("frame-src"));
    expect(frameSrc).toBe("frame-src https://challenges.cloudflare.com");
  });

  it.each([
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
  ])("has %s", (header) => {
    expect(all).toContain(header);
  });

  it("has HSTS and a Permissions-Policy that turns off camera, mic, geolocation", () => {
    expect(all.some((l) => l.startsWith("Strict-Transport-Security:"))).toBe(
      true,
    );
    const pp = all.find((l) => l.startsWith("Permissions-Policy:")) ?? "";
    for (const f of ["camera=()", "microphone=()", "geolocation=()"]) {
      expect(pp).toContain(f);
    }
  });
});

describe("public/_headers /g", () => {
  const g = block("/g");

  it("detaches the inherited Referrer-Policy and sets no-referrer", () => {
    expect(g).toContain("! Referrer-Policy");
    expect(g).toContain("Referrer-Policy: no-referrer");
    expect(g.indexOf("! Referrer-Policy")).toBeLessThan(
      g.indexOf("Referrer-Policy: no-referrer"),
    );
  });

  it("is noindex", () => {
    expect(g).toContain("X-Robots-Tag: noindex");
  });
});

describe("public/_headers /sw.js", () => {
  it("is never served from a stale HTTP cache", () => {
    expect(block("/sw.js")).toContain("Cache-Control: no-cache");
  });
});
