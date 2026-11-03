import { describe, expect, it } from "vitest";
import { callName, formatTodayLabel, greeting } from "./greeting";

describe("callName", () => {
  it.each([
    ["김하늘", "하늘아"],
    ["이민준", "민준아"],
    ["박서연", "서연아"],
    ["정도윤", "도윤아"],
    ["김하나", "하나야"],
    ["최유나", "유나야"],
    ["최수", "최수야"],
    ["이준", "이준아"],
    ["남궁민수", "남궁민수야"],
    [" 김하늘 ", "하늘아"],
    ["Jay", "Jay"],
    ["Alex", "Alex"],
    ["김 하늘", "김 하늘아"],
  ])("%s -> %s", (name, expected) => {
    expect(callName(name)).toBe(expected);
  });
});

describe("greeting", () => {
  it("greets by call name", () => {
    expect(greeting("김하늘")).toBe("하늘아, 오늘도 한 문장씩!");
  });
  it("omits the name when empty", () => {
    expect(greeting("")).toBe("오늘도 한 문장씩!");
  });
});

describe("formatTodayLabel", () => {
  it("uses the Seoul date", () => {
    expect(formatTodayLabel(new Date("2026-11-04T16:00:00Z"))).toBe(
      "11월 5일 목요일",
    );
  });
});
