import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import {
  consultationEditSchema,
  formatSeoulDateTime,
  phoneHref,
  sortConsultations,
  type ConsultationRecord,
} from "./adminConsultation";

function rec(
  id: string,
  status: ConsultationRecord["status"],
  createdAt: string,
): ConsultationRecord {
  return {
    id,
    parentName: id,
    phone: "010-0000-0001",
    grade: "중1",
    message: null,
    status,
    memo: null,
    createdAt,
  };
}

describe("sortConsultations", () => {
  it("puts new first, each group newest first", () => {
    const list = [
      rec("c", "contacted", "2026-11-03T01:00:00Z"),
      rec("n1", "new", "2026-11-01T01:00:00Z"),
      rec("n2", "new", "2026-11-02T01:00:00Z"),
      rec("h", "on_hold", "2026-11-04T01:00:00Z"),
    ];
    expect(sortConsultations(list).map((r) => r.id)).toEqual([
      "n2",
      "n1",
      "h",
      "c",
    ]);
  });
});

describe("consultationEditSchema", () => {
  const parse = (memo: string) =>
    consultationEditSchema.safeParse({ status: "contacted", memo });

  it("turns blank memo into null", () => {
    expect(parse("  ")).toMatchObject({ success: true, data: { memo: null } });
  });
  it("rejects over 2000 chars", () => {
    const r = parse("a".repeat(2001));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("메모는 2000자까지 쓸 수 있어요.");
  });
  it("rejects control chars but allows newlines", () => {
    const bad = parse("a\u0007");
    expect(bad.error?.issues[0]?.message).toBe(CONTROL_CHAR_MESSAGE);
    expect(parse("a\nb")).toMatchObject({ success: true });
  });
});

describe("phoneHref", () => {
  it("keeps digits only", () => {
    expect(phoneHref("010-0000-0091")).toBe("tel:01000000091");
  });
});

describe("formatSeoulDateTime", () => {
  it("formats in Seoul time regardless of the browser zone", () => {
    expect(formatSeoulDateTime("2026-11-03T15:05:00Z")).toBe(
      "2026.11.04 00:05",
    );
  });
});
