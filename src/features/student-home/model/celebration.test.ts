import { describe, expect, it } from "vitest";
import { celebrationKey, shouldCelebrate, withCelebrated } from "./celebration";

describe("celebration", () => {
  it("keys per student", () => {
    expect(celebrationKey("s1")).toBe("heesu:celebrated-goals:s1");
  });
  it("shouldCelebrate", () => {
    expect(shouldCelebrate(null, 30, 29)).toBe(false);
    expect(shouldCelebrate(null, 30, 30)).toBe(true);
    expect(shouldCelebrate("[30]", 30, 45)).toBe(false);
    expect(shouldCelebrate("[30]", 50, 50)).toBe(true);
    expect(shouldCelebrate("not json", 30, 30)).toBe(true);
  });
  it("withCelebrated", () => {
    expect(withCelebrated("[50]", 30)).toBe("[30,50]");
    expect(withCelebrated("[30]", 30)).toBe("[30]");
    expect(withCelebrated(null, 30)).toBe("[30]");
  });
});
