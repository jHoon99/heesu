import { describe, expect, it } from "vitest";
import { STUDENT_TABS, activeTabFor } from "./tabs";

describe("activeTabFor", () => {
  it.each([
    ["/s", "mine"],
    ["/s/", "mine"],
    ["/s/homework", "mine"],
    ["/s/me/", "mine"],
    ["/s/videos", "videos"],
    ["/s/videos/watch", "videos"],
    ["/s/materials", "materials"],
    ["/s/records", "records"],
    ["/s/questions", "questions"],
    ["/s/unknown", "mine"],
  ])("%s -> %s", (path, tab) => {
    expect(activeTabFor(path)).toBe(tab);
  });
});

describe("STUDENT_TABS", () => {
  it("follows 원장's menu within five tabs", () => {
    expect(STUDENT_TABS.map((t) => t.label)).toEqual([
      "나의 수업",
      "강의실",
      "자료실",
      "기록",
      "질문",
    ]);
    expect(STUDENT_TABS.map((t) => t.href)).toEqual([
      "/s",
      "/s/videos",
      "/s/materials",
      "/s/records",
      "/s/questions",
    ]);
  });
});
