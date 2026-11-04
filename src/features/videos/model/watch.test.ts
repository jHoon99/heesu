import { describe, expect, it } from "vitest";
import { advanceFurthest, isNewVideo, resumePosition } from "./watch";

describe("advanceFurthest", () => {
  it.each([
    [0, 0, 0.25, 0.25],
    [100, 100, 100.5, 100.5],
    [100, 100, 590, 100],
    [100, 590, 590.5, 100],
    [100, 50, 50.5, 100],
    [100, 101, 103, 103],
    [100, 10, 5, 100],
  ])("(%s, %s, %s) -> %s", (f, l, c, want) => {
    expect(advanceFurthest(f, l, c)).toBe(want);
  });
});

describe("resumePosition", () => {
  it("only resumes between 5s and duration-5s", () => {
    expect(resumePosition(3, 600)).toBe(0);
    expect(resumePosition(120, 600)).toBe(120);
    expect(resumePosition(596, 600)).toBe(0);
  });
});

describe("isNewVideo", () => {
  const now = new Date("2026-11-10T03:00:00Z");
  const ago = (d: number) =>
    new Date(now.getTime() - d * 86400000).toISOString();
  it("is new within 7 days and unwatched", () => {
    expect(isNewVideo({ publishedAt: ago(6), watchedSeconds: 0 }, now)).toBe(
      true,
    );
    expect(isNewVideo({ publishedAt: ago(8), watchedSeconds: 0 }, now)).toBe(
      false,
    );
    expect(isNewVideo({ publishedAt: ago(1), watchedSeconds: 30 }, now)).toBe(
      false,
    );
  });
});
