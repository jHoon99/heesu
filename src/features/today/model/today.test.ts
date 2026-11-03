import { describe, expect, it } from "vitest";
import type { ClassSummary } from "@/features/classes";
import { formatTodayHeading, todaysClasses } from "./today";

const mk = (
  name: string,
  schedule: ClassSummary["schedule"],
): ClassSummary => ({
  id: name,
  name,
  level: "middle",
  schedule,
  scheduleInvalid: false,
  capacity: null,
  memberCount: 0,
});
const slot = (day: number, start: string) => ({ day, start, end: "21:00" });

describe("todaysClasses", () => {
  it("keeps classes with that weekday, ordered by start time", () => {
    const a = mk("A", [slot(3, "19:00")]);
    const b = mk("B", [slot(3, "17:00")]);
    const c = mk("C", [slot(4, "17:00")]);
    expect(todaysClasses([a, b, c], 3).map((x) => x.cls.name)).toEqual([
      "B",
      "A",
    ]);
  });

  it("uses the earliest slot of that day", () => {
    const a = mk("A", [slot(3, "19:00"), slot(3, "17:00")]);
    expect(todaysClasses([a], 3)[0]?.slot.start).toBe("17:00");
  });

  it("breaks ties by name", () => {
    const x = mk("나반", [slot(3, "17:00")]);
    const y = mk("가반", [slot(3, "17:00")]);
    expect(todaysClasses([x, y], 3).map((r) => r.cls.name)).toEqual([
      "가반",
      "나반",
    ]);
  });
});

describe("formatTodayHeading", () => {
  it("formats month, day and Korean weekday", () => {
    expect(formatTodayHeading("2026-11-04")).toBe("11월 4일 수요일");
  });
});
