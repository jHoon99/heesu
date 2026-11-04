import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import {
  filterStudents,
  parseStudentRow,
  STATUS_TONE,
  studentCreateSchema,
  studentEditSchema,
  type StudentSummary,
} from "./students";

const base = {
  loginId: "haneul",
  password: "password1",
  name: "김하늘",
  grade: "중1",
  joinedAt: "2026-11-05",
};

describe("studentCreateSchema", () => {
  it("rejects a name with a control character", () => {
    const r = studentCreateSchema.safeParse({ ...base, name: "하늘\u0000" });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      CONTROL_CHAR_MESSAGE,
    ]);
  });

  it("trims and lowercases the login id", () => {
    const r = studentCreateSchema.parse({ ...base, loginId: " Haneul " });
    expect(r.loginId).toBe("haneul");
  });

  it.each(["ha-neul", "ab"])("rejects login id %j", (loginId) => {
    const r = studentCreateSchema.safeParse({ ...base, loginId });
    expect(r.error?.issues[0]?.message).toBe(
      "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.",
    );
  });

  it("rejects a 7 character password", () => {
    const r = studentCreateSchema.safeParse({ ...base, password: "1234567" });
    expect(r.error?.issues[0]?.message).toBe(
      "비밀번호는 8자 이상으로 입력해 주세요.",
    );
  });

  it("rejects an empty grade and name", () => {
    const r = studentCreateSchema.safeParse({ ...base, grade: "", name: " " });
    const messages = r.error?.issues.map((i) => i.message);
    expect(messages).toContain("학년을 골라 주세요.");
    expect(messages).toContain("이름을 1~20자로 입력해 주세요.");
  });
});

describe("parseStudentRow", () => {
  const row = {
    id: "s1",
    login_id: "haneul",
    name: "김하늘",
    grade: "중1",
    status: "active",
    joined_at: "2026-11-05",
  };

  it.each([null, [], [{ school: null }]])("school null for %j", (sp) => {
    expect(parseStudentRow({ ...row, student_private: sp }).school).toBeNull();
  });

  it("reads school and classes", () => {
    const s = parseStudentRow({
      ...row,
      student_private: { school: "희수중" },
      class_members: [{ classes: { id: "c1", name: "중등 A" } }],
    });
    expect(s.school).toBe("희수중");
    expect(s.classes).toEqual([{ id: "c1", name: "중등 A" }]);
  });
});

describe("filterStudents", () => {
  const mk = (over: Partial<StudentSummary>): StudentSummary => ({
    id: "1",
    loginId: "haneul",
    name: "김하늘",
    grade: "중1",
    status: "active",
    joinedAt: "2026-11-05",
    school: null,
    classes: [],
    ...over,
  });
  const list = [
    mk({}),
    mk({ id: "2", loginId: "minjun", name: "이민준", status: "left" }),
  ];

  it("filters by status", () => {
    expect(filterStudents(list, "left", "").map((s) => s.id)).toEqual(["2"]);
    expect(filterStudents(list, "all", "")).toHaveLength(2);
  });

  it.each(["하 늘", "HANEUL"])("finds by %j", (q) => {
    expect(filterStudents(list, "all", q).map((s) => s.id)).toEqual(["1"]);
  });
});

describe("studentEditSchema", () => {
  it("rejects a name with a control character", () => {
    const r = studentEditSchema.safeParse({
      name: "하늘\u0000",
      grade: "중1",
      status: "active",
      joinedAt: "2026-11-05",
    });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      CONTROL_CHAR_MESSAGE,
    ]);
  });
});

describe("STATUS_TONE", () => {
  it("gives paused and left different tones", () => {
    expect(STATUS_TONE.paused).not.toBe(STATUS_TONE.left);
    expect(STATUS_TONE.paused).toBe("warning");
    expect(STATUS_TONE.left).toBe("neutral");
  });
});
