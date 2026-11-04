import { describe, expect, it } from "vitest";
import {
  buildViewRows,
  completeCount,
  formatDateTime,
  isComplete,
  isScheduled,
  watchedPercent,
} from "./views";

describe("watchedPercent", () => {
  it("floors and treats the complete threshold as 100", () => {
    expect(watchedPercent(300, 600)).toBe(50);
    expect(watchedPercent(599, 600)).toBe(100);
    expect(watchedPercent(0, 600)).toBe(0);
    expect(watchedPercent(10, 0)).toBe(100);
  });
});

describe("isComplete", () => {
  it("is true from 95% of the duration", () => {
    expect(isComplete(570, 600)).toBe(true);
    expect(isComplete(569, 600)).toBe(false);
  });
});

describe("buildViewRows", () => {
  const roster = [
    { studentId: "s3", name: "다" },
    { studentId: "s1", name: "가" },
    { studentId: "s2", name: "나" },
  ];
  const views = [
    { studentId: "s2", watchedSeconds: 300, updatedAt: "2026-11-04T01:30:00Z" },
    { studentId: "s4", watchedSeconds: 600, updatedAt: "2026-11-04T01:30:00Z" },
  ];

  it("lists roster students only, by name, zero when no record", () => {
    const rows = buildViewRows(roster, views, 600);
    expect(rows.map((r) => r.name)).toEqual(["가", "나", "다"]);
    expect(rows[0]).toMatchObject({ percent: 0, updatedAt: null });
    expect(rows[1]).toMatchObject({ percent: 50, watchedSeconds: 300 });
    expect(rows.some((r) => r.studentId === "s4")).toBe(false);
  });

  it("counts complete students", () => {
    const rows = buildViewRows(
      roster,
      [{ studentId: "s1", watchedSeconds: 590, updatedAt: "x" }, ...views],
      600,
    );
    expect(completeCount(rows, 600)).toBe(1);
  });
});

describe("isScheduled", () => {
  it("is true for a future published_at", () => {
    const now = new Date("2026-11-09T00:00:00+09:00");
    expect(isScheduled("2026-11-10T00:00:00+09:00", now)).toBe(true);
    expect(isScheduled("2026-11-09T00:00:00+09:00", now)).toBe(false);
  });
});

describe("formatDateTime", () => {
  it("formats in Seoul time", () => {
    expect(formatDateTime("2026-11-04T01:30:00Z")).toBe("11/4 10:30");
  });
});
