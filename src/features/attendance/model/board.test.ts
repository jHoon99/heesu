import { describe, expect, it } from "vitest";
import type { Session } from "@/features/sessions";
import { applyCell, buildBoard, toTableDates } from "./board";

const session = (id: string, date: string): Session => ({
  id,
  classId: "c1",
  date,
  summary: null,
  homework: null,
  homeworkDue: null,
});

describe("buildBoard", () => {
  const board = buildBoard({
    sessions: [session("s2", "2026-11-05"), session("s1", "2026-11-03")],
    members: [
      { id: "u3", name: "한별", grade: "중2", status: "active" },
      { id: "u1", name: "김하늘", grade: "중1", status: "active" },
      { id: "u2", name: "나쉼", grade: "중1", status: "paused" },
      { id: "u4", name: "다떠남", grade: "중1", status: "left" },
    ],
    attendance: [
      { session_id: "s1", student_id: "u1", status: "present" },
      { session_id: "s1", student_id: "u2", status: "late" },
      { session_id: "s1", student_id: "gone", status: "absent" },
    ],
    homework: [{ session_id: "s1", student_id: "u1", status: "done" }],
  });

  it("keeps only active members, sorted by name", () => {
    expect(board.students).toEqual([
      { id: "u1", name: "김하늘", grade: "중1" },
      { id: "u3", name: "한별", grade: "중2" },
    ]);
  });

  it("orders sessions by date ascending", () => {
    expect(board.sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("fills records only where rows exist, for shown students", () => {
    expect(board.records).toEqual({
      u1: { s1: { att: "present", hw: "done" } },
    });
  });
});

describe("applyCell", () => {
  it("changes only that field of that cell without mutating", () => {
    const records = {
      u1: { s1: { att: "present" as const, hw: "done" as const } },
    };
    const next = applyCell(records, "u1", "s1", "att", "late");
    expect(next).toEqual({ u1: { s1: { att: "late", hw: "done" } } });
    expect(records.u1.s1.att).toBe("present");
    expect(applyCell({}, "u2", "s9", "hw", "missing")).toEqual({
      u2: { s9: { hw: "missing" } },
    });
  });
});

describe("toTableDates", () => {
  it("marks today and formats labels", () => {
    expect(
      toTableDates(
        [session("s1", "2026-11-03"), session("s2", "2026-11-05")],
        "2026-11-05",
      ),
    ).toEqual([
      { key: "s1", label: "11/3", day: "화", today: false },
      { key: "s2", label: "11/5", day: "목", today: true },
    ]);
  });
});

describe("buildBoard submittedAt", () => {
  it("carries submitted_at onto the homework cell and survives an admin edit", () => {
    const board = buildBoard({
      sessions: [session("s1", "2026-11-03")],
      members: [{ id: "u1", name: "김하늘", grade: "중1", status: "active" }],
      attendance: [],
      homework: [
        {
          session_id: "s1",
          student_id: "u1",
          status: "none",
          submitted_at: "2026-11-03T06:30:00Z",
        },
      ],
    });
    expect(board.records.u1?.s1).toEqual({
      hw: "none",
      submittedAt: "2026-11-03T06:30:00Z",
    });
    expect(
      applyCell(board.records, "u1", "s1", "hw", "done").u1?.s1?.submittedAt,
    ).toBe("2026-11-03T06:30:00Z");
  });
});
