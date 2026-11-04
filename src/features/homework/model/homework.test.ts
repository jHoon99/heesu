import { describe, expect, it } from "vitest";
import {
  buildHomeworkItems,
  canSubmit,
  formatSubmittedAt,
  homeworkProgress,
  pickTodayHomework,
  sortHomework,
  type HomeworkItem,
  type HomeworkSessionRow,
} from "./homework";

const TODAY = "2026-11-05";
const NO_JOIN: ReadonlyMap<string, string> = new Map();

const session = (
  id: string,
  date: string,
  over: Partial<HomeworkSessionRow> = {},
): HomeworkSessionRow => ({
  id,
  class_id: "cA",
  date,
  homework: "교재 10쪽",
  homework_due: null,
  classes: { name: "A반" },
  ...over,
});

const item = (
  id: string,
  date: string,
  status: HomeworkItem["status"] = "none",
  over: Partial<HomeworkItem> = {},
): HomeworkItem => ({
  sessionId: id,
  classId: "cA",
  className: "A반",
  date,
  homework: "x",
  due: null,
  status,
  submittedAt: null,
  ...over,
});

describe("buildHomeworkItems", () => {
  it("drops blank homework, future dates and sessions without a class", () => {
    const out = buildHomeworkItems(
      [
        session("blank", "2026-11-03", { homework: "  " }),
        session("future", "2026-11-06"),
        session("noclass", "2026-11-03", { classes: null }),
        session("ok", "2026-11-04"),
      ],
      [],
      TODAY,
      NO_JOIN,
    );
    expect(out.map((i) => i.sessionId)).toEqual(["ok"]);
  });

  it("ignores a missing check whose session is not loaded", () => {
    const out = buildHomeworkItems(
      [session("s1", "2026-11-04")],
      [{ session_id: "gone", status: "missing", submitted_at: null }],
      TODAY,
      NO_JOIN,
    );
    expect(out.map((i) => i.sessionId)).toEqual(["s1"]);
  });

  it("defaults to none/null and joins the check", () => {
    const out = buildHomeworkItems(
      [session("s1", "2026-11-04"), session("s2", "2026-11-03")],
      [
        {
          session_id: "s2",
          status: "done",
          submitted_at: "2026-11-03T01:00:00Z",
        },
      ],
      TODAY,
      NO_JOIN,
    );
    expect(out[0]).toMatchObject({ status: "none", submittedAt: null });
    expect(out[1]).toMatchObject({
      status: "done",
      submittedAt: "2026-11-03T01:00:00Z",
    });
  });

  describe("join date", () => {
    const joined = new Map([["cA", "2026-11-04"]]);
    const missing = (id: string) => ({
      session_id: id,
      status: "missing" as const,
      submitted_at: null,
    });

    it("drops a session before the join date with no check", () => {
      const out = buildHomeworkItems(
        [session("before", "2026-11-03")],
        [],
        TODAY,
        joined,
      );
      expect(out).toEqual([]);
    });

    it("keeps a session before the join date that has a check", () => {
      const out = buildHomeworkItems(
        [session("before", "2026-11-03")],
        [missing("before")],
        TODAY,
        joined,
      );
      expect(out.map((i) => i.sessionId)).toEqual(["before"]);
    });

    it("keeps a session on the join date", () => {
      const out = buildHomeworkItems(
        [session("on", "2026-11-04")],
        [],
        TODAY,
        joined,
      );
      expect(out.map((i) => i.sessionId)).toEqual(["on"]);
    });

    it("keeps sessions of a class with no join info", () => {
      const out = buildHomeworkItems(
        [session("x", "2026-11-03", { class_id: "cB" })],
        [],
        TODAY,
        joined,
      );
      expect(out.map((i) => i.sessionId)).toEqual(["x"]);
    });
  });

  it("keeps each session once", () => {
    const out = buildHomeworkItems(
      [session("s1", "2026-11-04"), session("s1", "2026-11-04")],
      [],
      TODAY,
      NO_JOIN,
    );
    expect(out).toHaveLength(1);
  });
});

describe("sortHomework", () => {
  it("puts missing first (oldest first), then the rest newest first", () => {
    const out = sortHomework([
      item("a", "2026-11-04"),
      item("b", "2026-10-28", "missing"),
      item("c", "2026-11-03", "done"),
      item("d", "2026-11-02", "missing"),
    ]);
    expect(out.map((i) => i.date)).toEqual([
      "2026-10-28",
      "2026-11-02",
      "2026-11-04",
      "2026-11-03",
    ]);
  });
});

describe("pickTodayHomework", () => {
  it("takes the latest per class plus all missing", () => {
    const out = pickTodayHomework([
      item("a1", "2026-11-04"),
      item("a2", "2026-11-02", "missing"),
      item("a3", "2026-10-30", "done"),
      item("b1", "2026-11-03", "done", { classId: "cB", className: "B반" }),
    ]);
    expect(out.map((i) => i.sessionId)).toEqual(["a2", "a1", "b1"]);
  });

  it("does not repeat a missing latest item", () => {
    const out = pickTodayHomework([
      item("a1", "2026-11-04", "missing"),
      item("a2", "2026-11-02"),
    ]);
    expect(out.map((i) => i.sessionId)).toEqual(["a1"]);
  });
});

describe("canSubmit / homeworkProgress", () => {
  it("allows submit only when not done and not yet submitted", () => {
    expect(canSubmit(item("a", "d", "none"))).toBe(true);
    expect(canSubmit(item("a", "d", "missing"))).toBe(true);
    expect(canSubmit(item("a", "d", "missing", { submittedAt: "t" }))).toBe(
      false,
    );
    expect(canSubmit(item("a", "d", "done"))).toBe(false);
  });

  it("counts done or submitted as finished", () => {
    expect(
      homeworkProgress([
        item("a", "d", "done"),
        item("b", "d", "none", { submittedAt: "t" }),
        item("c", "d", "none"),
        item("e", "d", "missing"),
      ]),
    ).toEqual({ finished: 2, total: 4 });
  });
});

describe("formatSubmittedAt", () => {
  it("formats in Seoul time", () => {
    expect(formatSubmittedAt("2026-11-04T06:30:00Z")).toBe("11/4 15:30");
  });
});
