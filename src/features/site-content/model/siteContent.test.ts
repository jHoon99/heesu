import { describe, expect, it } from "vitest";
import { EMPTY_SITE_CONTENT, parseSiteContent } from "./siteContent";

describe("parseSiteContent", () => {
  it("returns the empty content for no rows", () => {
    expect(parseSiteContent([])).toEqual(EMPTY_SITE_CONTENT);
  });

  it("maps snake_case to camelCase when every key is valid", () => {
    const content = parseSiteContent([
      { key: "notice", value: { title: "공지", body: "내용", visible: true } },
      {
        key: "classes",
        value: [
          { name: "기초반", grades: "중1", schedule: "월 17:00", capacity: 8 },
        ],
      },
      {
        key: "tuition",
        value: { middle: "월 1", high: "별도", note: "안내" },
      },
      { key: "contact", value: { phone: "063", address: "전주" } },
      {
        key: "legal",
        value: {
          academy_name: "희수",
          registration_no: "1",
          subjects: "영어",
          tuition_notice: "게시",
        },
      },
    ]);
    expect(content).toEqual({
      notice: { title: "공지", body: "내용" },
      classes: [
        { name: "기초반", grades: "중1", schedule: "월 17:00", capacity: 8 },
      ],
      tuition: { middle: "월 1", high: "별도", note: "안내" },
      contact: { phone: "063", address: "전주" },
      legal: {
        academyName: "희수",
        registrationNo: "1",
        subjects: "영어",
        tuitionNotice: "게시",
      },
      pointsGoal: 30,
      about: { intro: null, items: [] },
    });
  });

  it("hides the notice when invisible or the title is blank", () => {
    expect(
      parseSiteContent([
        { key: "notice", value: { title: "a", body: "b", visible: false } },
      ]).notice,
    ).toBeNull();
    expect(
      parseSiteContent([
        { key: "notice", value: { title: "  ", body: "b", visible: true } },
      ]).notice,
    ).toBeNull();
  });

  it("trims strings and turns blanks into null", () => {
    const { contact } = parseSiteContent([
      { key: "contact", value: { phone: "  ", address: " 전주 " } },
    ]);
    expect(contact).toEqual({ phone: null, address: "전주" });
  });

  it("returns no classes for a non-array value", () => {
    expect(
      parseSiteContent([{ key: "classes", value: { name: "x" } }]).classes,
    ).toEqual([]);
  });

  it("drops only class items without a name and nulls invalid capacity", () => {
    const { classes } = parseSiteContent([
      {
        key: "classes",
        value: [
          { name: "A", capacity: "8" },
          { grades: "중1" },
          { name: "  " },
          null,
          { name: "B", capacity: -1 },
          { name: "C", capacity: 2.5 },
          { name: "D", capacity: 6 },
        ],
      },
    ]);
    expect(classes.map((c) => [c.name, c.capacity])).toEqual([
      ["A", null],
      ["B", null],
      ["C", null],
      ["D", 6],
    ]);
  });

  it("keeps other keys when one key is malformed", () => {
    const content = parseSiteContent([
      { key: "tuition", value: 42 },
      { key: "contact", value: { phone: "063", address: "전주" } },
    ]);
    expect(content.tuition).toEqual({
      middle: null,
      high: null,
      note: null,
    });
    expect(content.contact).toEqual({ phone: "063", address: "전주" });
  });

  it("ignores unknown keys", () => {
    expect(parseSiteContent([{ key: "points_goal", value: { a: 1 } }])).toEqual(
      EMPTY_SITE_CONTENT,
    );
  });

  it("reads points_goal only when it is an integer from 1 to 10000", () => {
    const goal = (value: unknown) =>
      parseSiteContent([{ key: "points_goal", value }]).pointsGoal;
    expect(goal(50)).toBe(50);
    for (const bad of ["50", 0, 10001, 2.5, null]) expect(goal(bad)).toBe(30);
    expect(parseSiteContent([]).pointsGoal).toBe(30);
  });

  it("reads the about intro and https link cards", () => {
    const { about } = parseSiteContent([
      {
        key: "about",
        value: {
          intro: "  첫 줄\n둘째 줄 ",
          items: [
            {
              title: " 블로그 ",
              url: "https://blog.naver.com/heesu/1",
              teaser: " 무엇일까요?\n기준을 이야기해요. ",
            },
            { title: "인스타", url: "https://www.instagram.com/heesu" },
            { title: "숫자 소개", url: "https://a.example", teaser: 3 },
          ],
        },
      },
    ]);
    expect(about).toEqual({
      intro: "첫 줄\n둘째 줄",
      items: [
        {
          title: "블로그",
          url: "https://blog.naver.com/heesu/1",
          teaser: "무엇일까요?\n기준을 이야기해요.",
          image: null,
        },
        {
          title: "인스타",
          url: "https://www.instagram.com/heesu",
          teaser: null,
          image: null,
        },
        {
          title: "숫자 소개",
          url: "https://a.example",
          teaser: null,
          image: null,
        },
      ],
    });
  });

  it("drops non-https and untitled link cards and never throws", () => {
    const { about } = parseSiteContent([
      {
        key: "about",
        value: {
          intro: 3,
          items: [
            { title: "js", url: "javascript:alert(1)" },
            { title: "data", url: "data:text/html,x" },
            { title: "http", url: "http://blog.naver.com" },
            { title: "깨진 주소", url: "https://" },
            { title: "", url: "https://a.example" },
            { title: "숫자 주소", url: 1 },
            "문자열 칸",
            null,
            { title: "좋아요", url: "https://ok.example" },
          ],
        },
      },
    ]);
    expect(about).toEqual({
      intro: null,
      items: [
        {
          title: "좋아요",
          url: "https://ok.example",
          teaser: null,
          image: null,
        },
      ],
    });
    expect(parseSiteContent([{ key: "about", value: "x" }]).about).toEqual(
      EMPTY_SITE_CONTENT.about,
    );
  });

  it("caps link cards at 10", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      title: `t${i}`,
      url: `https://a.example/${i}`,
    }));
    const { about } = parseSiteContent([{ key: "about", value: { items } }]);
    expect(about.items).toHaveLength(10);
    expect(about.items[9]?.title).toBe("t9");
  });
});
