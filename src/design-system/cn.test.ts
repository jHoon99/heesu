import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps DS text-size token and color together", () => {
    expect(cn("text-label", "text-text-on-brand")).toBe(
      "text-label text-text-on-brand",
    );
  });
  it("still dedupes conflicting sizes and colors", () => {
    expect(cn("text-label", "text-caption")).toBe("text-caption");
    expect(cn("text-text-muted", "text-text-brand")).toBe("text-text-brand");
  });
});
