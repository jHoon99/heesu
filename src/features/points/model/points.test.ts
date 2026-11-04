import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import {
  formatAmount,
  manualPointSchema,
  rankStudents,
  sortHistory,
} from "./points";
import type { PointEntry, PointTotal } from "./points";

const AMOUNT_MESSAGE =
  "포인트는 -100부터 100 사이의 0이 아닌 정수로 입력해 주세요.";
const REASON_MESSAGE = "사유를 1~100자로 입력해 주세요.";

const t = (
  name: string,
  total: number,
  status: PointTotal["status"] = "active",
): PointTotal => ({
  studentId: name,
  name,
  grade: "중1",
  status,
  total,
});

describe("rankStudents", () => {
  it("uses standard competition ranking for ties", () => {
    const ranked = rankStudents([
      t("가", 3),
      t("나", 10),
      t("다", 7),
      t("라", 7),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
    expect(ranked.map((r) => r.total)).toEqual([10, 7, 7, 3]);
  });

  it("orders ties by name", () => {
    const ranked = rankStudents([t("다", 7), t("나", 7)]);
    expect(ranked.map((r) => r.name)).toEqual(["나", "다"]);
  });

  it("excludes paused and left students", () => {
    const ranked = rankStudents([
      t("가", 1),
      t("나", 9, "left"),
      t("다", 9, "paused"),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(["가"]);
  });

  it("sorts negative totals below zero", () => {
    const ranked = rankStudents([t("가", -2), t("나", 0), t("다", -5)]);
    expect(ranked.map((r) => [r.name, r.rank])).toEqual([
      ["나", 1],
      ["가", 2],
      ["다", 3],
    ]);
  });
});

describe("manualPointSchema", () => {
  const parse = (amount: string, reason: string) =>
    manualPointSchema.safeParse({ amount, reason });

  it.each(["0", "101", "1.5", "abc", "", "-101"])(
    "rejects amount %j",
    (amount) => {
      const r = parse(amount, "사유");
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe(AMOUNT_MESSAGE);
    },
  );

  it("parses signed integers", () => {
    expect(parse("+3", "사유").data).toEqual({ amount: 3, reason: "사유" });
    expect(parse(" -2 ", "  사유 ").data).toEqual({
      amount: -2,
      reason: "사유",
    });
    expect(parse("100", "사유").success).toBe(true);
    expect(parse("-100", "사유").success).toBe(true);
  });

  it("rejects blank, long and control-character reasons", () => {
    expect(parse("1", "  ").error?.issues[0]?.message).toBe(REASON_MESSAGE);
    expect(parse("1", "가".repeat(101)).error?.issues[0]?.message).toBe(
      REASON_MESSAGE,
    );
    expect(parse("1", "a\u0007").error?.issues[0]?.message).toBe(
      CONTROL_CHAR_MESSAGE,
    );
  });
});

describe("formatAmount", () => {
  it("signs the number", () => {
    expect(formatAmount(3)).toBe("+3");
    expect(formatAmount(-2)).toBe("-2");
  });
});

describe("sortHistory", () => {
  const e = (
    id: string,
    createdAt: string,
    sessionDate: string | null,
  ): PointEntry => ({ id, amount: 1, reason: "r", createdAt, sessionDate });

  it("orders by shown date desc, then createdAt desc", () => {
    const rows = [
      e("old-session", "2026-11-04T01:00:00Z", "2026-10-20"),
      e("manual-mid", "2026-11-02T01:00:00Z", null),
      e("same-day-late", "2026-11-02T05:00:00Z", "2026-11-02"),
      e("recent", "2026-11-03T01:00:00Z", "2026-11-03"),
    ];
    expect(sortHistory(rows).map((r) => r.id)).toEqual([
      "recent",
      "same-day-late",
      "manual-mid",
      "old-session",
    ]);
  });

  it("uses the local (Seoul) date of createdAt for manual rows", () => {
    // 14:59Z is still 11/3 in KST, 15:00Z is 11/4.
    const rows = [
      e("a", "2026-11-03T14:59:00Z", null),
      e("b", "2026-11-03T15:00:00Z", null),
      e("c", "2026-11-04T00:00:00Z", "2026-11-03"),
    ];
    expect(sortHistory(rows).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input", () => {
    const rows = [
      e("a", "2026-11-01T00:00:00Z", null),
      e("b", "2026-11-02T00:00:00Z", null),
    ];
    sortHistory(rows);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
