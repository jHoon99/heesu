import { describe, expect, it } from "vitest";
import { STUDENT_TABS, activeTabFor } from "./tabs";

describe("activeTabFor", () => {
  it.each([
    ["/s", "home"],
    ["/s/", "home"],
    ["/s/homework", "homework"],
    ["/s/me/", "me"],
    ["/s/videos", "videos"],
    ["/s/questions", "questions"],
    ["/s/unknown", "home"],
  ])("%s -> %s", (path, tab) => {
    expect(activeTabFor(path)).toBe(tab);
  });
});

describe("STUDENT_TABS", () => {
  it("has the fixed labels and hrefs", () => {
    expect(STUDENT_TABS.map((t) => t.label)).toEqual([
      "홈",
      "숙제",
      "영상",
      "질문",
      "내 정보",
    ]);
    expect(STUDENT_TABS.map((t) => t.href)).toEqual([
      "/s",
      "/s/homework",
      "/s/videos",
      "/s/questions",
      "/s/me",
    ]);
  });
});
