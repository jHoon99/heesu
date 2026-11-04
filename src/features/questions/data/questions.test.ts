import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";

const h = vi.hoisted(() => ({
  result: {} as unknown,
  calls: [] as unknown[][],
}));
vi.mock("@/core/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit", "is", "insert", "lte"]) {
    chain[m] = (...a: unknown[]) => {
      h.calls.push([m, ...a]);
      return chain;
    };
  }
  chain.then = (res: (v: unknown) => unknown) =>
    Promise.resolve(h.result).then(res);
  return { supabase: { from: () => chain } };
});

import {
  askQuestion,
  listMyQuestions,
  listRecentSessions,
  answerQuestion,
  countUnansweredQuestions,
  listAdminQuestions,
} from "./questions";

beforeEach(() => {
  h.calls = [];
});

const row = (over: Record<string, unknown>) => ({
  id: "q1",
  body: "b",
  created_at: "t",
  answered_at: null,
  video_id: null,
  session_id: null,
  students: { name: "가" },
  videos: null,
  sessions: null,
  answers: [],
  ...over,
});

describe("listAdminQuestions", () => {
  it("maps links: deleted video/none -> null, session -> session link", async () => {
    h.result = {
      error: null,
      data: [
        row({}),
        row({
          id: "q2",
          session_id: "s1",
          sessions: { date: "2026-11-03", classes: { name: "A반" } },
        }),
        row({
          id: "q3",
          video_id: "v1",
          videos: { title: "1단원" },
          answers: [{ id: "a", body: "x", created_at: "t2" }],
        }),
      ],
    };
    const out = await listAdminQuestions();
    expect(out[0]?.link).toBeNull();
    expect(out[1]?.link).toEqual({
      kind: "session",
      sessionId: "s1",
      date: "2026-11-03",
      className: "A반",
    });
    expect(out[2]?.link).toEqual({
      kind: "video",
      videoId: "v1",
      title: "1단원",
    });
    expect(out[2]?.answers).toEqual([{ id: "a", body: "x", createdAt: "t2" }]);
    expect(h.calls).toContainEqual(["limit", 200]);
  });
});

describe("countUnansweredQuestions", () => {
  it("filters answered_at is null and returns the count", async () => {
    h.result = { error: null, count: 3 };
    await expect(countUnansweredQuestions()).resolves.toBe(3);
    expect(h.calls).toContainEqual(["is", "answered_at", null]);
  });
});

describe("answerQuestion", () => {
  it("throws SaveNotAppliedError on 0 rows", async () => {
    h.result = { error: null, data: [] };
    await expect(answerQuestion("q1", "b")).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });
  it("resolves when a row is inserted", async () => {
    h.result = { error: null, data: [{ id: "a" }] };
    await expect(answerQuestion("q1", "b")).resolves.toBeUndefined();
    expect(h.calls).toContainEqual([
      "insert",
      { question_id: "q1", body: "b" },
    ]);
  });
});

describe("askQuestion", () => {
  it("inserts only body and links, never student_id", async () => {
    h.result = { error: null, data: [{ id: "q" }] };
    await askQuestion({ body: "질문", videoId: "v1", sessionId: null });
    const ins = h.calls.find((c) => c[0] === "insert");
    expect(ins?.[1]).toEqual({
      body: "질문",
      video_id: "v1",
      session_id: null,
    });
    expect(Object.keys(ins?.[1] as object)).not.toContain("student_id");
  });
  it("throws SaveNotAppliedError on 0 rows", async () => {
    h.result = { error: null, data: [] };
    await expect(
      askQuestion({ body: "질문", videoId: null, sessionId: null }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
  });
});

describe("listMyQuestions", () => {
  it("maps rows without a student name", async () => {
    h.result = {
      error: null,
      data: [
        {
          id: "q1",
          body: "b",
          created_at: "t",
          answered_at: null,
          video_id: "v1",
          session_id: null,
          videos: { title: "1단원" },
          sessions: null,
          answers: [{ id: "a", body: "x", created_at: "t2" }],
        },
      ],
    };
    const r = await listMyQuestions();
    expect(r[0]?.link).toEqual({
      kind: "video",
      videoId: "v1",
      title: "1단원",
    });
    expect(r[0]?.answers).toHaveLength(1);
    expect(r[0]).not.toHaveProperty("studentName");
  });
});

describe("listRecentSessions", () => {
  it("maps sessions up to today", async () => {
    h.result = {
      error: null,
      data: [{ id: "s1", date: "2026-11-04", classes: { name: "A반" } }],
    };
    await expect(listRecentSessions("2026-11-04")).resolves.toEqual([
      { id: "s1", date: "2026-11-04", className: "A반" },
    ]);
    expect(h.calls).toContainEqual(["lte", "date", "2026-11-04"]);
  });
});
