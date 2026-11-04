import { describe, expect, it } from "vitest";
import { isSiteImagePath, newSiteImagePath, siteImageUrl } from "./siteImages";

describe("site images", () => {
  it("makes a fresh about/<uuid>.jpg path each time", () => {
    const a = newSiteImagePath("jpg");
    expect(isSiteImagePath(a)).toBe(true);
    expect(a).not.toBe(newSiteImagePath("jpg"));
  });

  it("accepts only paths inside the about folder", () => {
    for (const bad of [
      "https://evil.example/x.jpg",
      "about/../videos/x.mp4",
      "about/11111111-1111-4111-8111-111111111111.svg",
      "videos/11111111-1111-4111-8111-111111111111.jpg",
      "",
      3,
      null,
    ])
      expect(isSiteImagePath(bad)).toBe(false);
  });

  it("builds the public photo address", () => {
    expect(siteImageUrl("about/a.jpg", "https://x.supabase.co/")).toBe(
      "https://x.supabase.co/storage/v1/object/public/site-images/about/a.jpg",
    );
  });
});
