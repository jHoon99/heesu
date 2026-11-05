import { describe, expect, it } from "vitest";
import { nextClassDate } from "./schedule";

const monWed = [
  { day: 1, start: "17:00", end: "18:30" },
  { day: 3, start: "17:00", end: "18:30" },
];

describe("nextClassDate", () => {
  it("is today on a class day", () => {
    // 2026-11-02 is a Monday
    expect(nextClassDate(monWed, "2026-11-02")).toBe("2026-11-02");
  });
  it("is the next class day otherwise", () => {
    expect(nextClassDate(monWed, "2026-11-03")).toBe("2026-11-04");
    expect(nextClassDate(monWed, "2026-11-05")).toBe("2026-11-09");
  });
  it("is null without a schedule", () => {
    expect(nextClassDate([], "2026-11-05")).toBeNull();
  });
});
