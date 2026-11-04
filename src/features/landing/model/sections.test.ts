import { describe, expect, it } from "vitest";
import { SECTIONS, shouldShowCtaBar } from "./sections";

describe("SECTIONS", () => {
  it("lists the seven sections in page order", () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      "about",
      "director",
      "tuition",
      "consult",
    ]);
  });
});

describe("shouldShowCtaBar", () => {
  it("hides near the top", () => {
    expect(shouldShowCtaBar(400, 2000, 800)).toBe(false);
  });
  it("shows after scrolling while the consult section is far", () => {
    expect(shouldShowCtaBar(600, 2000, 800)).toBe(true);
  });
  it("hides when the consult section is near", () => {
    expect(shouldShowCtaBar(600, 600, 800)).toBe(false);
  });
});
