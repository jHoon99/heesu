import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import { parseSiteContent } from "./siteContent";
import {
  classesWriteSchema,
  contactWriteSchema,
  legalWriteSchema,
  noticeWriteSchema,
  pointsGoalWriteSchema,
  readEditable,
  tuitionWriteSchema,
} from "./siteContentWrite";

const issue = (r: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => (r.success ? null : (r.error?.issues[0]?.message ?? null));

describe("readEditable", () => {
  it("turns seed-shaped rows into form values", () => {
    const e = readEditable([
      { key: "notice", value: { title: "공지", body: "내용", visible: true } },
      {
        key: "classes",
        value: [{ name: "기초", grades: "중1", schedule: "월", capacity: 8 }],
      },
      { key: "tuition", value: { monthly: "1", textbook: "2", note: "3" } },
      { key: "contact", value: { phone: "063-000-0000", address: "전주" } },
      {
        key: "legal",
        value: {
          academy_name: "a",
          registration_no: "b",
          subjects: "c",
          tuition_notice: "d",
        },
      },
      { key: "points_goal", value: 30 },
    ]);
    expect(e.notice).toEqual({ title: "공지", body: "내용", visible: true });
    expect(e.classes).toEqual([
      { name: "기초", grades: "중1", schedule: "월", capacity: "8" },
    ]);
    expect(e.legal.academyName).toBe("a");
    expect(e.pointsGoal).toBe("30");
  });

  it("keeps the text of a hidden notice", () => {
    const e = readEditable([
      { key: "notice", value: { title: "숨김", body: "b", visible: false } },
    ]);
    expect(e.notice).toEqual({ title: "숨김", body: "b", visible: false });
  });

  it("reads malformed values as blanks", () => {
    const e = readEditable([
      { key: "classes", value: {} },
      { key: "points_goal", value: "x" },
      { key: "tuition", value: 5 },
    ]);
    expect(e.classes).toEqual([]);
    expect(e.pointsGoal).toBe("");
    expect(e.tuition).toEqual({ monthly: "", textbook: "", note: "" });
    expect(e.notice).toEqual({ title: "", body: "", visible: false });
  });
});

describe("write schemas", () => {
  it("round-trips legal through parseSiteContent", () => {
    const form = {
      academyName: " 희수 ",
      registrationNo: "1",
      subjects: "",
      tuitionNotice: "게시",
    };
    const out = legalWriteSchema.parse(form);
    expect(out).toEqual({
      academy_name: "희수",
      registration_no: "1",
      subjects: null,
      tuition_notice: "게시",
    });
    expect(parseSiteContent([{ key: "legal", value: out }]).legal).toEqual({
      academyName: "희수",
      registrationNo: "1",
      subjects: null,
      tuitionNotice: "게시",
    });
  });

  it("turns blanks into null", () => {
    expect(
      tuitionWriteSchema.parse({ monthly: " ", textbook: "", note: "" }),
    ).toEqual({ monthly: null, textbook: null, note: null });
    expect(contactWriteSchema.parse({ phone: "", address: "" })).toEqual({
      phone: null,
      address: null,
    });
  });

  const cls = (capacity: string) => [
    { name: "A", grades: "", schedule: "", capacity },
  ];
  it("validates class capacity", () => {
    expect(classesWriteSchema.parse(cls(""))[0]?.capacity).toBeNull();
    expect(classesWriteSchema.parse(cls("50"))[0]?.capacity).toBe(50);
    for (const bad of ["0", "51", "1.5"])
      expect(issue(classesWriteSchema.safeParse(cls(bad)))).toBe(
        "정원은 1~50 사이 숫자로 입력해 주세요.",
      );
  });

  it("requires a class name and at most 10 classes", () => {
    expect(
      issue(
        classesWriteSchema.safeParse([
          { name: " ", grades: "", schedule: "", capacity: "" },
        ]),
      ),
    ).toBe("반 이름을 입력해 주세요.");
    expect(
      classesWriteSchema.safeParse(Array.from({ length: 11 }, () => cls("")[0]))
        .success,
    ).toBe(false);
  });

  it("validates phone", () => {
    expect(
      issue(contactWriteSchema.safeParse({ phone: "010-1234", address: "" })),
    ).toBe("전화번호는 063-000-0000처럼 숫자와 -로 입력해 주세요.");
    expect(
      contactWriteSchema.safeParse({ phone: "063-000-0000", address: "" })
        .success,
    ).toBe(true);
    expect(
      contactWriteSchema.safeParse({ phone: "", address: "" }).success,
    ).toBe(true);
  });

  it("validates the points goal", () => {
    for (const bad of ["0", "10001", "1.5", "abc", ""])
      expect(issue(pointsGoalWriteSchema.safeParse(bad))).toBe(
        "목표는 1~10000 사이 숫자로 입력해 주세요.",
      );
    expect(pointsGoalWriteSchema.parse(" 25 ")).toBe(25);
  });

  it("needs a title to show the notice", () => {
    expect(
      issue(
        noticeWriteSchema.safeParse({ title: " ", body: "", visible: true }),
      ),
    ).toBe("공지를 보이려면 제목을 입력해 주세요.");
    expect(
      noticeWriteSchema.parse({ title: "", body: "", visible: false }),
    ).toEqual({ title: null, body: null, visible: false });
  });

  it("limits lengths", () => {
    expect(
      issue(
        noticeWriteSchema.safeParse({
          title: "가".repeat(41),
          body: "",
          visible: true,
        }),
      ),
    ).toBe("40자까지 쓸 수 있어요.");
    expect(
      issue(
        noticeWriteSchema.safeParse({
          title: "t",
          body: "가".repeat(501),
          visible: true,
        }),
      ),
    ).toBe("500자까지 쓸 수 있어요.");
  });

  it("rejects control characters but allows body line breaks", () => {
    expect(
      issue(contactWriteSchema.safeParse({ phone: "", address: "a\u0007" })),
    ).toBe(CONTROL_CHAR_MESSAGE);
    expect(
      issue(
        tuitionWriteSchema.safeParse({
          monthly: "",
          textbook: "",
          note: "a\u0007",
        }),
      ),
    ).toBe(CONTROL_CHAR_MESSAGE);
    expect(
      noticeWriteSchema.parse({ title: "t", body: "a\nb", visible: true }).body,
    ).toBe("a\nb");
    expect(
      issue(contactWriteSchema.safeParse({ phone: "", address: "a\nb" })),
    ).toBe(CONTROL_CHAR_MESSAGE);
  });
});
