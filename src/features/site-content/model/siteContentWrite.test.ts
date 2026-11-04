import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import { parseSiteContent } from "./siteContent";
import {
  aboutWriteSchema,
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

describe("about", () => {
  const link = (title: string, url: string, teaser = "", image = "") => ({
    title,
    url,
    teaser,
    image,
  });
  const EMPTY = link("", "");

  it("starts the form with three empty cards when nothing is saved", () => {
    expect(readEditable([]).about).toEqual({
      intro: "",
      items: [EMPTY, EMPTY, EMPTY],
    });
    expect(
      readEditable([
        {
          key: "about",
          value: { intro: "안녕", items: [link("블로그", "https://a.b")] },
        },
      ]).about,
    ).toEqual({ intro: "안녕", items: [link("블로그", "https://a.b")] });
  });

  it("builds the DB shape, keeps line breaks and drops untouched cards", () => {
    expect(
      aboutWriteSchema.parse({
        intro: " 첫 줄\n둘째 줄 ",
        items: [
          link(" 블로그 ", " https://blog.naver.com/heesu ", " 첫째\n둘째 "),
          link("", "  ", " "),
          link("인스타", "https://www.instagram.com/heesu"),
        ],
      }),
    ).toEqual({
      intro: "첫 줄\n둘째 줄",
      items: [
        {
          title: "블로그",
          url: "https://blog.naver.com/heesu",
          teaser: "첫째\n둘째",
          image: null,
        },
        {
          title: "인스타",
          url: "https://www.instagram.com/heesu",
          teaser: null,
          image: null,
        },
      ],
    });
    expect(
      aboutWriteSchema.parse({ intro: "", items: [link("", "")] }),
    ).toEqual({ intro: null, items: [] });
  });

  it("says how to fix each field", () => {
    const parse = (
      items: { title: string; url: string; teaser: string; image: string }[],
      intro = "",
    ) => issue(aboutWriteSchema.safeParse({ intro, items }));
    expect(parse([link("", "https://a.b")])).toBe("제목을 입력해 주세요.");
    expect(parse([link("가".repeat(41), "https://a.b")])).toBe(
      "40자까지 쓸 수 있어요.",
    );
    expect(parse([], "가".repeat(301))).toBe("300자까지 쓸 수 있어요.");
    expect(parse([link("t", "https://a.b", "가".repeat(121))])).toBe(
      "120자까지 쓸 수 있어요.",
    );
    // 짧은 소개만 쓴 카드도 빈 카드가 아니라서 제목·주소를 물어봐요.
    expect(parse([link("", "", "소개만")])).toBe("제목을 입력해 주세요.");
    const URL_MESSAGE = "https://로 시작하는 주소를 붙여 넣어 주세요.";
    for (const url of [
      "",
      "javascript:alert(1)",
      "http://blog.naver.com",
      "data:text/html,x",
      "https://a.b/x y",
      "https://a.b/<script>",
      "https://",
    ])
      expect(parse([link("t", url)])).toBe(URL_MESSAGE);
    expect(
      parse(Array.from({ length: 11 }, (_, i) => link(`t${i}`, "https://a.b"))),
    ).toBe("링크는 10개까지 넣을 수 있어요.");
    expect(parse([link("a\u0007", "https://a.b")])).toBe(CONTROL_CHAR_MESSAGE);
    expect(parse([], "a\u0007")).toBe(CONTROL_CHAR_MESSAGE);
    expect(parse([link("t", "https://a.b", "a\u0007")])).toBe(
      CONTROL_CHAR_MESSAGE,
    );
  });

  const IMG = "about/11111111-1111-4111-8111-111111111111.jpg";

  it("keeps an uploaded photo path and refuses any other address", () => {
    expect(
      readEditable([
        {
          key: "about",
          value: {
            items: [
              { title: "a", url: "https://a.b", image: IMG },
              {
                title: "b",
                url: "https://a.b",
                image: "https://evil.example/x.jpg",
              },
            ],
          },
        },
      ]).about.items.map((it) => it.image),
    ).toEqual([IMG, ""]);
    expect(
      aboutWriteSchema.parse({
        intro: "",
        items: [link("t", "https://a.b", "", IMG)],
      }).items[0]?.image,
    ).toBe(IMG);
    expect(
      issue(
        aboutWriteSchema.safeParse({
          intro: "",
          items: [link("t", "https://a.b", "", "../videos/x.mp4")],
        }),
      ),
    ).toBe("사진을 다시 올려 주세요.");
    // 사진만 올린 카드는 빈 카드가 아니라서 제목·주소를 물어봐요.
    expect(
      issue(
        aboutWriteSchema.safeParse({
          intro: "",
          items: [link("", "", "", IMG)],
        }),
      ),
    ).toBe("제목을 입력해 주세요.");
  });

  it("puts a card's error on that card's field", () => {
    const r = aboutWriteSchema.safeParse({
      intro: "",
      items: [link("", ""), link("t", "javascript:x")],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["items", 1, "url"]);
  });
});
