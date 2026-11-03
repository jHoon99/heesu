import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import {
  dayLabelOf,
  formatShortDate,
  isoDayOf,
  nextScheduleDate,
  sessionFormSchema,
  toLocalDateKey,
} from "./sessions";

const slot = (day: number, start = "17:00", end = "19:00") => ({
  day,
  start,
  end,
});

describe("nextScheduleDate", () => {
  it("finds the next scheduled weekday after the date", () => {
    expect(nextScheduleDate([slot(1), slot(3)], "2026-11-02")).toBe(
      "2026-11-04",
    );
  });
  it("skips the same day and goes to the next scheduled day", () => {
    expect(nextScheduleDate([slot(1), slot(3)], "2026-11-04")).toBe(
      "2026-11-09",
    );
  });
  it("uses a week later for a single weekday", () => {
    expect(nextScheduleDate([slot(1)], "2026-11-02")).toBe("2026-11-09");
  });
  it("handles a date that is not a scheduled day", () => {
    expect(nextScheduleDate([slot(1)], "2026-11-08")).toBe("2026-11-09");
  });
  it("returns null for an empty schedule", () => {
    expect(nextScheduleDate([], "2026-11-02")).toBeNull();
  });
  it("ignores duplicate slots on the same weekday", () => {
    expect(
      nextScheduleDate(
        [slot(1, "17:00", "18:00"), slot(1, "19:00", "20:00")],
        "2026-11-02",
      ),
    ).toBe("2026-11-09");
  });
  it("crosses the year boundary", () => {
    expect(nextScheduleDate([slot(7)], "2026-12-27")).toBe("2027-01-03");
  });
});

describe("date helpers", () => {
  it("reads the ISO weekday", () => {
    expect(isoDayOf("2026-11-08")).toBe(7);
    expect(isoDayOf("2026-11-02")).toBe(1);
  });
  it("formats short dates and labels", () => {
    expect(formatShortDate("2026-11-04")).toBe("11/4");
    expect(dayLabelOf("2026-11-04")).toBe("수");
  });
  it("uses the Seoul date around midnight KST", () => {
    expect(toLocalDateKey(new Date("2026-11-03T14:59:00Z"))).toBe("2026-11-03");
    expect(toLocalDateKey(new Date("2026-11-03T15:00:00Z"))).toBe("2026-11-04");
    expect(toLocalDateKey(new Date("2026-12-31T16:30:00Z"))).toBe("2027-01-01");
  });
});

const base = { date: "2026-11-02", summary: "", homework: "", homeworkDue: "" };

describe("sessionFormSchema", () => {
  it("rejects a due date before the session date", () => {
    const r = sessionFormSchema.safeParse({
      ...base,
      homeworkDue: "2026-11-01",
    });
    expect(r.error?.issues[0]).toMatchObject({
      path: ["homeworkDue"],
      message: "숙제 마감일은 수업 날짜와 같거나 그 뒤로 골라 주세요.",
    });
  });
  it("accepts a due date equal to the session date", () => {
    expect(
      sessionFormSchema.safeParse({ ...base, homeworkDue: "2026-11-02" })
        .success,
    ).toBe(true);
  });
  it("turns empty values into null", () => {
    expect(sessionFormSchema.parse({ ...base, summary: "  " })).toEqual({
      date: "2026-11-02",
      summary: null,
      homework: null,
      homeworkDue: null,
    });
  });
  it("requires a date", () => {
    const r = sessionFormSchema.safeParse({ ...base, date: "" });
    expect(r.error?.issues[0]?.message).toBe("수업 날짜를 골라 주세요.");
  });
  it("allows newlines in text", () => {
    expect(
      sessionFormSchema.parse({ ...base, summary: "줄1\n줄2" }).summary,
    ).toBe("줄1\n줄2");
  });
  it("rejects control characters", () => {
    const r = sessionFormSchema.safeParse({ ...base, summary: "a\u0007" });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      CONTROL_CHAR_MESSAGE,
    ]);
  });
  it("limits lengths", () => {
    expect(
      sessionFormSchema.safeParse({ ...base, homework: "a".repeat(1001) }).error
        ?.issues[0]?.message,
    ).toBe("숙제 내용은 1000자까지 쓸 수 있어요.");
    expect(
      sessionFormSchema.safeParse({ ...base, summary: "a".repeat(2001) }).error
        ?.issues[0]?.message,
    ).toBe("수업 내용은 2000자까지 쓸 수 있어요.");
  });
});
