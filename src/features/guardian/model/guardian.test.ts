import { describe, expect, it } from "vitest";
import {
  guardianUrl,
  isGuardianLinkError,
  parseGuardianView,
  readTokenFromHash,
} from "./guardian";

const tok = "A".repeat(10) + "b-_".repeat(11);

describe("readTokenFromHash", () => {
  it("reads a valid token", () => {
    expect(tok).toHaveLength(43);
    expect(readTokenFromHash(`#t=${tok}`)).toBe(tok);
    expect(readTokenFromHash(`#x=1&t=${tok}`)).toBe(tok);
  });
  it.each([
    ["empty", ""],
    ["hash only", "#"],
    ["empty t", "#t="],
    ["42 chars", `#t=${tok.slice(1)}`],
    ["44 chars", `#t=${tok}a`],
    ["trailing space", `#t=${tok}%20`],
    ["bad char", `#t=${tok.slice(1)}*`],
  ])("rejects %s", (_n, hash) => {
    expect(readTokenFromHash(hash)).toBeNull();
  });
});

describe("guardianUrl", () => {
  it("uses the fragment only", () => {
    expect(guardianUrl("https://heesu.pages.dev", tok)).toBe(
      `https://heesu.pages.dev/g#t=${tok}`,
    );
  });
});

const raw = {
  name: "김하늘",
  today: "2026-11-04",
  total_points: 12,
  records: [
    {
      date: "2026-11-03",
      class_name: "중1 A",
      attendance: "present",
      homework: "done",
    },
  ],
  week: [
    {
      date: "2026-11-03",
      class_name: "중1 A",
      summary: "문법",
      homework: null,
      homework_due: null,
    },
  ],
};

describe("parseGuardianView", () => {
  it("maps snake_case to camelCase and keeps nulls", () => {
    const v = parseGuardianView(raw);
    expect(v.totalPoints).toBe(12);
    expect(v.records[0]).toEqual({
      date: "2026-11-03",
      className: "중1 A",
      attendance: "present",
      homework: "done",
    });
    expect(v.week[0]).toEqual({
      date: "2026-11-03",
      className: "중1 A",
      summary: "문법",
      homework: null,
      homeworkDue: null,
    });
  });
  it("maps tests and clinic, and defaults them to empty", () => {
    expect(parseGuardianView(raw).tests).toEqual([]);
    expect(parseGuardianView(raw).clinic).toEqual([]);
    const v = parseGuardianView({
      ...raw,
      tests: [
        {
          date: "2026-11-03",
          kind: "word",
          title: "Day 1",
          score: 12,
          max_score: 20,
          pass_score: null,
        },
      ],
      clinic: [
        {
          kind: "word_retest",
          status: "done",
          created_on: "2026-11-01",
          done_on: "2026-11-02",
        },
      ],
    });
    expect(v.tests[0]).toEqual({
      date: "2026-11-03",
      kind: "word",
      title: "Day 1",
      score: 12,
      maxScore: 20,
      passScore: null,
    });
    expect(v.clinic[0]).toEqual({
      kind: "word_retest",
      status: "done",
      createdOn: "2026-11-01",
      doneOn: "2026-11-02",
    });
  });
  it("throws on a different shape", () => {
    expect(() =>
      parseGuardianView({
        ...raw,
        records: [{ ...raw.records[0], attendance: "weird" }],
      }),
    ).toThrow();
    expect(() => parseGuardianView(null)).toThrow();
  });
});

describe("isGuardianLinkError", () => {
  it("is true only for P0001", () => {
    expect(isGuardianLinkError({ code: "P0001" })).toBe(true);
    expect(isGuardianLinkError({ code: "42501" })).toBe(false);
    expect(isGuardianLinkError(new TypeError("Failed to fetch"))).toBe(false);
  });
});
