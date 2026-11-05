import { describe, expect, it } from "vitest";
import { formatScore, testSchema } from "./testRecords";

const valid = {
  takenOn: "2026-11-05",
  kind: "word",
  title: " Day 12 ",
  score: "18",
  maxScore: "20",
  memo: "",
} as const;

describe("testSchema", () => {
  it("parses numbers, trims the title and nulls a blank memo", () => {
    expect(testSchema.parse(valid)).toEqual({
      takenOn: "2026-11-05",
      kind: "word",
      title: "Day 12",
      score: 18,
      maxScore: 20,
      memo: null,
    });
  });
  it("rejects a score above the max on the score field", () => {
    const r = testSchema.safeParse({ ...valid, score: "21" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({
      path: ["score"],
      message: "점수가 만점보다 클 수 없어요. 숫자를 확인해 주세요.",
    });
  });
  it.each([
    ["score", "", "점수를 0~1000 사이 숫자로 입력해 주세요."],
    ["score", "-1", "점수를 0~1000 사이 숫자로 입력해 주세요."],
    ["maxScore", "0", "만점을 1~1000 사이 숫자로 입력해 주세요."],
    ["title", " ", "제목을 1~40자로 입력해 주세요. 예: Day 12"],
    ["takenOn", "", "날짜를 골라 주세요."],
  ])("rejects %s=%j", (field, value, message) => {
    const r = testSchema.safeParse({ ...valid, [field]: value });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain(message);
  });
  it("rejects control characters in the title", () => {
    expect(testSchema.safeParse({ ...valid, title: "a\tb" }).success).toBe(
      false,
    );
  });
});

describe("formatScore", () => {
  it("shows the percent rounded", () => {
    expect(formatScore(18, 20)).toBe("18/20 (90%)");
    expect(formatScore(2, 3)).toBe("2/3 (67%)");
  });
});
