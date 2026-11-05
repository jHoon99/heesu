import { describe, expect, it } from "vitest";
import { activeMenuFor, ADMIN_MENU } from "./menu";

describe("ADMIN_MENU", () => {
  it("keeps the spec order of items and groups", () => {
    expect(
      ADMIN_MENU.filter((e) => "label" in e).map(
        (e) => "label" in e && e.label,
      ),
    ).toEqual([
      "오늘",
      "출결·숙제",
      "수업일지",
      "학생",
      "반",
      "영상",
      "자료실",
      "질문",
      "클리닉",
      "포인트",
      "상담",
      "수납",
      "홈페이지 관리",
      "설정",
    ]);
    expect(
      ADMIN_MENU.filter((e) => "group" in e).map(
        (e) => "group" in e && e.group,
      ),
    ).toEqual(["수업", "학부모", "운영"]);
  });
});

describe("activeMenuFor", () => {
  it.each([
    ["/admin", "today"],
    ["/admin/", "today"],
    ["/admin/students", "students"],
    ["/admin/students/detail", "students"],
    ["/admin/classes/edit", "classes"],
    ["/admin/site", "site"],
    ["/admin/clinic", "clinic"],
    ["/admin/materials", "materials"],
  ])("%s -> %s", (path, expected) => {
    expect(activeMenuFor(path)).toBe(expected);
  });
});
