import { describe, expect, it } from "vitest";
import {
  bodySchema,
  formatQuestionTime,
  linkLabel,
  sortAdminQuestions,
  type AdminQuestion,
} from "./questions";

const msg = (v: string) => {
  const r = bodySchema.safeParse(v);
  return r.success ? "ok" : r.error.issues[0]?.message;
};

describe("bodySchema", () => {
  it("rejects blank, too long, control chars; allows newlines", () => {
    expect(msg("   ")).toBe("내용을 입력해 주세요.");
    expect(msg("a".repeat(2001))).toBe("2000자까지 쓸 수 있어요.");
    expect(msg("a\u0007")).toContain("특수 문자");
    expect(msg("첫 줄\n둘째 줄")).toBe("ok");
  });
});

const q = (
  id: string,
  createdAt: string,
  answered: boolean,
): AdminQuestion => ({
  id,
  body: "b",
  createdAt,
  answeredAt: answered ? createdAt : null,
  link: null,
  answers: [],
  studentName: "가",
});

describe("sortAdminQuestions", () => {
  it("puts unanswered first, newest first within each group", () => {
    const out = sortAdminQuestions([
      q("a5", "2026-11-05T01:00:00Z", true),
      q("u3", "2026-11-03T01:00:00Z", false),
      q("u4", "2026-11-04T01:00:00Z", false),
      q("a2", "2026-11-02T01:00:00Z", true),
    ]);
    expect(out.map((x) => x.id)).toEqual(["u4", "u3", "a5", "a2"]);
  });
});

describe("linkLabel / formatQuestionTime", () => {
  it("labels both kinds", () => {
    expect(linkLabel({ kind: "video", videoId: "v", title: "1단원" })).toBe(
      "영상 · 1단원",
    );
    expect(
      linkLabel({
        kind: "session",
        sessionId: "s",
        date: "2026-11-03",
        className: "A반",
      }),
    ).toBe("수업 · 11/3(화) A반");
  });
  it("formats in Seoul time", () => {
    expect(formatQuestionTime("2026-11-04T08:05:00Z")).toBe("11/4 17:05");
    expect(formatQuestionTime("2026-11-04T15:30:00Z")).toBe("11/5 00:30");
  });
});
