import { describe, expect, it } from "vitest";
import {
  clinicAddSchema,
  clinicSource,
  EMPTY_NOTE,
  noteChanged,
  noteTextSchema,
  openCount,
  parseBoardRow,
  parseClinicRow,
  parseNote,
  shortDate,
} from "./clinic";

describe("noteTextSchema", () => {
  it("trims and turns blank into null", () => {
    expect(noteTextSchema.parse("  ")).toBeNull();
    expect(noteTextSchema.parse(" 단어 약함 ")).toBe("단어 약함");
  });
  it("allows line breaks but not other control characters", () => {
    expect(noteTextSchema.parse("a\nb")).toBe("a\nb");
    expect(noteTextSchema.safeParse("a\u0007").success).toBe(false);
  });
  it("rejects more than 1000 characters", () => {
    const r = noteTextSchema.safeParse("가".repeat(1001));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("메모는 1000자까지 쓸 수 있어요.");
  });
});

describe("clinicAddSchema", () => {
  it("keeps the kind and nulls a blank memo", () => {
    expect(
      clinicAddSchema.parse({ kind: "concept_review", memo: " " }),
    ).toEqual({ kind: "concept_review", memo: null });
  });
  it("rejects a line break in the memo", () => {
    expect(
      clinicAddSchema.safeParse({ kind: "word_retest", memo: "a\nb" }).success,
    ).toBe(false);
  });
});

describe("parse", () => {
  it("parses a lesson note row and defaults when missing", () => {
    expect(
      parseNote({
        note: "x",
        needs_word_retest: true,
        needs_concept_review: false,
      }),
    ).toEqual({ note: "x", wordRetest: true, conceptReview: false });
    expect(parseNote(undefined)).toEqual(EMPTY_NOTE);
  });
  it("takes the session date from the embedded session", () => {
    const item = parseClinicRow({
      id: "c1",
      student_id: "s1",
      session_id: "x1",
      kind: "concept_review",
      status: "done",
      memo: null,
      done_at: "2026-11-06T01:00:00Z",
      created_at: "2026-11-05T01:00:00Z",
      sessions: { date: "2026-11-05" },
    });
    expect(item).toMatchObject({
      sessionDate: "2026-11-05",
      kind: "concept_review",
      status: "done",
    });
    expect(clinicSource(item)).toBe("11/5 수업");
  });
  it("reads board rows with the student name", () => {
    const item = parseBoardRow({
      id: "c1",
      student_id: "s1",
      session_id: null,
      session_date: null,
      kind: "word_retest",
      status: "open",
      created_at: "2026-11-05T01:00:00Z",
      student_name: "김하늘",
      grade: "고1",
    });
    expect(item.studentName).toBe("김하늘");
    expect(clinicSource(item)).toBe("직접 추가");
    expect(
      clinicSource(parseBoardRow({ id: "c2", test_date: "2026-11-07" })),
    ).toBe("11/7 테스트");
  });
});

describe("helpers", () => {
  it("shortDate drops leading zeros", () => {
    expect(shortDate("2026-01-09")).toBe("1/9");
  });
  it("counts open items", () => {
    const base = parseClinicRow({ id: "a", status: "open" });
    expect(
      openCount([base, { ...base, status: "done" }, { ...base, id: "b" }]),
    ).toBe(2);
  });
  it("noteChanged ignores surrounding spaces", () => {
    const initial = { note: "x", wordRetest: false, conceptReview: false };
    expect(
      noteChanged(initial, {
        note: " x ",
        wordRetest: false,
        conceptReview: false,
      }),
    ).toBe(false);
    expect(
      noteChanged(initial, {
        note: "x",
        wordRetest: true,
        conceptReview: false,
      }),
    ).toBe(true);
    expect(
      noteChanged(EMPTY_NOTE, {
        note: "",
        wordRetest: false,
        conceptReview: false,
      }),
    ).toBe(false);
  });
});
