import { describe, expect, it } from "vitest";
import {
  defaultPassScore,
  formatScore,
  isBelowPass,
  testSchema,
} from "./testRecords";

const valid = {
  takenOn: "2026-11-05",
  kind: "word",
  title: " Day 12 ",
  score: "18",
  maxScore: "20",
  passScore: "",
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
      passScore: null,
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

describe("pass score", () => {
  it("defaults to 80% rounded up", () => {
    expect(defaultPassScore(20)).toBe(16);
    expect(defaultPassScore(25)).toBe(20);
    expect(defaultPassScore(7)).toBe(6);
  });
  it("rejects a pass score above the max", () => {
    const r = testSchema.safeParse({ ...valid, passScore: "21" });
    expect(r.error?.issues[0]).toMatchObject({
      path: ["passScore"],
      message: "통과 기준이 만점보다 클 수 없어요. 숫자를 확인해 주세요.",
    });
  });
  it("is below only when a pass score exists", () => {
    expect(isBelowPass({ score: 15, passScore: 16 })).toBe(true);
    expect(isBelowPass({ score: 16, passScore: 16 })).toBe(false);
    expect(isBelowPass({ score: 0, passScore: null })).toBe(false);
  });
});
