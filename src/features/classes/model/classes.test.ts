import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import {
  classFormSchema,
  formatSchedule,
  parseClassRow,
  parseSchedule,
  scheduleSlotSchema,
} from "./classes";

const slot = (day: number, start: string, end: string) => ({ day, start, end });

describe("formatSchedule", () => {
  it("sorts by day and joins", () => {
    expect(
      formatSchedule([slot(3, "17:00", "19:00"), slot(1, "17:00", "19:00")]),
    ).toBe("월 17:00–19:00 · 수 17:00–19:00");
  });
  it("says none for an empty schedule", () => {
    expect(formatSchedule([])).toBe("시간표 없음");
  });
});

describe("scheduleSlotSchema", () => {
  it("rejects end before start on the end path", () => {
    const r = scheduleSlotSchema.safeParse(slot(1, "17:00", "16:00"));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({
      path: ["end"],
      message: "끝나는 시각을 시작보다 늦게 적어 주세요.",
    });
  });
  it("rejects a malformed time", () => {
    const r = scheduleSlotSchema.safeParse(slot(1, "7:00", "19:00"));
    expect(r.error?.issues[0]?.message).toBe("시각은 17:00처럼 적어 주세요.");
  });
});

const base = { name: " 중등 A ", level: "middle" as const, capacity: "" };

describe("classFormSchema", () => {
  it("trims the name and turns an empty capacity into null", () => {
    const r = classFormSchema.parse({ ...base, schedule: [] });
    expect(r).toMatchObject({ name: "중등 A", capacity: null });
  });
  it.each(["0", "51", "3.5"])("rejects capacity %s", (capacity) => {
    const r = classFormSchema.safeParse({ ...base, capacity, schedule: [] });
    expect(r.error?.issues[0]?.message).toBe(
      "정원은 1~50명으로 입력해 주세요.",
    );
  });
  it("accepts a valid capacity", () => {
    expect(
      classFormSchema.parse({ ...base, capacity: "12", schedule: [] }).capacity,
    ).toBe(12);
  });
  it("rejects overlapping slots on the same day", () => {
    const r = classFormSchema.safeParse({
      ...base,
      schedule: [slot(1, "17:00", "19:00"), slot(1, "18:30", "20:00")],
    });
    expect(r.error?.issues[0]?.message).toBe(
      "같은 요일에 겹치는 시간이 있어요. 시간을 고쳐 주세요.",
    );
  });
  it("allows back-to-back and different-day slots", () => {
    expect(
      classFormSchema.safeParse({
        ...base,
        schedule: [
          slot(1, "17:00", "19:00"),
          slot(1, "19:00", "21:00"),
          slot(2, "17:00", "19:00"),
        ],
      }).success,
    ).toBe(true);
  });
  it("rejects a name with a control character", () => {
    const r = classFormSchema.safeParse({
      ...base,
      name: "반\u001b",
      schedule: [],
    });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      CONTROL_CHAR_MESSAGE,
    ]);
  });
  it("rejects an empty name", () => {
    expect(
      classFormSchema.safeParse({ ...base, name: "  ", schedule: [] }).success,
    ).toBe(false);
  });
});

describe("parseClassRow", () => {
  it("flags an unreadable schedule instead of silently emptying it", () => {
    expect(
      parseClassRow({
        id: "a",
        name: "A",
        level: "high",
        schedule: "x",
        capacity: null,
        class_members: [{ count: 3 }],
      }),
    ).toEqual({
      id: "a",
      name: "A",
      level: "high",
      schedule: [],
      scheduleInvalid: true,
      capacity: null,
      memberCount: 3,
    });
  });
});

describe("parseSchedule", () => {
  it("reads a valid schedule", () => {
    expect(parseSchedule([slot(1, "17:00", "19:00")])).toEqual({
      invalid: false,
      schedule: [slot(1, "17:00", "19:00")],
    });
  });
  it("treats an empty array as valid", () => {
    expect(parseSchedule([])).toEqual({ invalid: false, schedule: [] });
  });
  it.each([["x"], [null], [[{ day: 9, start: "1", end: "2" }]]])(
    "flags %j as invalid",
    (value) => {
      expect(parseSchedule(value)).toEqual({ invalid: true, schedule: [] });
    },
  );
});
