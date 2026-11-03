import { describe, expect, it } from "vitest";
import { EMPTY_SITE_CONTENT, parseSiteContent } from "./siteContent";

describe("parseSiteContent", () => {
  it("returns the empty content for no rows", () => {
    expect(parseSiteContent([])).toEqual(EMPTY_SITE_CONTENT);
  });

  it("maps snake_case to camelCase when every key is valid", () => {
    const content = parseSiteContent([
      { key: "notice", value: { title: "공지", body: "내용", visible: true } },
      { key: "classes", value: [{ name: "기초반", grades: "중1", schedule: "월 17:00", capacity: 8 }] },
      { key: "tuition", value: { monthly: "월 1", textbook: "별도", note: "안내" } },
      { key: "contact", value: { phone: "063", address: "전주" } },
      {
        key: "legal",
        value: { academy_name: "희수", registration_no: "1", subjects: "영어", tuition_notice: "게시" },
      },
    ]);
    expect(content).toEqual({
      notice: { title: "공지", body: "내용" },
      classes: [{ name: "기초반", grades: "중1", schedule: "월 17:00", capacity: 8 }],
      tuition: { monthly: "월 1", textbook: "별도", note: "안내" },
      contact: { phone: "063", address: "전주" },
      legal: { academyName: "희수", registrationNo: "1", subjects: "영어", tuitionNotice: "게시" },
    });
  });

  it("hides the notice when invisible or the title is blank", () => {
    expect(parseSiteContent([{ key: "notice", value: { title: "a", body: "b", visible: false } }]).notice).toBeNull();
    expect(parseSiteContent([{ key: "notice", value: { title: "  ", body: "b", visible: true } }]).notice).toBeNull();
  });

  it("trims strings and turns blanks into null", () => {
    const { contact } = parseSiteContent([{ key: "contact", value: { phone: "  ", address: " 전주 " } }]);
    expect(contact).toEqual({ phone: null, address: "전주" });
  });

  it("returns no classes for a non-array value", () => {
    expect(parseSiteContent([{ key: "classes", value: { name: "x" } }]).classes).toEqual([]);
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
    expect(content.tuition).toEqual({ monthly: null, textbook: null, note: null });
    expect(content.contact).toEqual({ phone: "063", address: "전주" });
  });

  it("ignores unknown keys", () => {
    expect(parseSiteContent([{ key: "points_goal", value: { a: 1 } }])).toEqual(EMPTY_SITE_CONTENT);
  });
});
