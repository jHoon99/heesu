import { describe, expect, it } from "vitest";
import {
  buildPaymentRows,
  formatWon,
  monthKeyOf,
  monthLabel,
  monthWindow,
  paymentFormSchema,
  rangeLabel,
  shiftMonth,
  type PayableStudent,
  type PaymentRecord,
} from "./payments";

describe("month helpers", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
  it("builds a 6 month window oldest first", () => {
    expect(monthWindow("2026-11")).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
  });
  it("labels", () => {
    expect(monthLabel("2026-11")).toBe("11월");
    expect(monthLabel("2027-01")).toBe("2027년 1월");
    expect(rangeLabel(monthWindow("2026-11"))).toBe("2026년 6월 ~ 11월");
    expect(rangeLabel(monthWindow("2027-02"))).toBe("2026년 9월 ~ 2027년 2월");
  });
  it("uses the Seoul month for the key", () => {
    expect(monthKeyOf(new Date("2026-10-31T16:00:00Z"))).toBe("2026-11");
  });
  it("formats won", () => {
    expect(formatWon(250000)).toBe("250,000원");
  });
});

const s = (id: string, name: string, status: PayableStudent["status"]) => ({
  id,
  name,
  status,
});
const rec = (studentId: string, month: string): PaymentRecord => ({
  id: `${studentId}-${month}`,
  studentId,
  month,
  amount: 1,
  paidAt: null,
  memo: null,
});

describe("buildPaymentRows", () => {
  const months = monthWindow("2026-11");
  it("keeps left students only with records, sorted by name, cells by month", () => {
    const rows = buildPaymentRows(
      [
        s("b", "나", "active"),
        s("a", "가", "paused"),
        s("l1", "다", "left"),
        s("l2", "라", "left"),
      ],
      [rec("l2", "2026-07"), rec("b", "2026-11")],
      months,
    );
    expect(rows.map((r) => r.student.id)).toEqual(["a", "b", "l2"]);
    expect(rows[1]!.cells[5]?.id).toBe("b-2026-11");
    expect(rows[1]!.cells[0]).toBeNull();
    expect(rows[2]!.cells[1]?.month).toBe("2026-07");
  });
});

describe("paymentFormSchema", () => {
  const parse = (o: Partial<Record<string, string>>) =>
    paymentFormSchema.safeParse({ amount: "1", paidAt: "", memo: "", ...o });
  const AMOUNT_MSG = "금액은 0~10,000,000원 사이 숫자로 입력해 주세요.";
  it("parses amounts", () => {
    expect(parse({ amount: "250,000" })).toMatchObject({
      success: true,
      data: { amount: 250000, paidAt: null, memo: null },
    });
    expect(parse({ amount: " 0 " })).toMatchObject({
      success: true,
      data: { amount: 0 },
    });
  });
  it.each(["-1", "10000001", "1e7", "2.5", ""])("rejects %j", (amount) => {
    const r = parse({ amount });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(AMOUNT_MSG);
  });
  it("handles paidAt and memo", () => {
    expect(parse({ paidAt: "2026-11-05", memo: " 현금 " })).toMatchObject({
      success: true,
      data: { paidAt: "2026-11-05", memo: "현금" },
    });
    const long = parse({ memo: "a".repeat(201) });
    expect(long.success).toBe(false);
    if (!long.success)
      expect(long.error.issues[0]?.message).toBe(
        "메모는 200자까지 쓸 수 있어요.",
      );
    expect(parse({ memo: "a\nb" }).success).toBe(false);
  });
});
