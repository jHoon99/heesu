import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GALLERY_PHOTOS } from "../model/gallery";
import { GallerySection } from "./GallerySection";

describe("GallerySection", () => {
  it("shows every photo once to screen readers", () => {
    render(<GallerySection />);
    const region = screen.getByRole("region", { name: "학원 사진" });
    const imgs = within(region).getAllByRole("img");
    expect(imgs).toHaveLength(GALLERY_PHOTOS.length);
    expect(imgs.map((i) => i.getAttribute("alt"))).toEqual(
      GALLERY_PHOTOS.map((p) => p.alt),
    );
  });

  it("repeats the strip once, hidden, so the loop has no seam", () => {
    const { container } = render(<GallerySection />);
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(GALLERY_PHOTOS.length * 2);
    const dup = [...items].slice(GALLERY_PHOTOS.length);
    for (const li of dup) {
      expect(li).toHaveAttribute("aria-hidden", "true");
      expect(li.querySelector("img")).toHaveAttribute("alt", "");
    }
  });

  it("only serves local images", () => {
    for (const p of GALLERY_PHOTOS)
      expect(p.src.startsWith("/gallery/")).toBe(true);
  });
});
