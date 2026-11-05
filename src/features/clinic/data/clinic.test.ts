import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { listSessionNotes, saveLessonNote, setClinicStatus } from "./clinic";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("saveLessonNote", () => {
  function setup(data: unknown) {
    const select = vi.fn().mockResolvedValue({ data, error: null });
    const upsert = vi.fn(() => ({ select }));
    from.mockReturnValue({ upsert } as never);
    return { upsert };
  }
  it("upserts on session_id,student_id with both checks", async () => {
    const { upsert } = setup([{ session_id: "x" }]);
    await saveLessonNote("x", "s", {
      note: "메모",
      wordRetest: true,
      conceptReview: false,
    });
    expect(from).toHaveBeenCalledWith("lesson_notes");
    expect(upsert).toHaveBeenCalledWith(
      {
        session_id: "x",
        student_id: "s",
        note: "메모",
        needs_word_retest: true,
        needs_concept_review: false,
      },
      { onConflict: "session_id,student_id" },
    );
  });
  it("throws SaveNotAppliedError on 0 rows", async () => {
    setup([]);
    await expect(
      saveLessonNote("x", "s", {
        note: null,
        wordRetest: false,
        conceptReview: false,
      }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
  });
});

describe("setClinicStatus", () => {
  it("updates only status and throws on 0 rows", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    from.mockReturnValue({ update } as never);
    await expect(setClinicStatus("c1", "done")).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
    expect(update).toHaveBeenCalledWith({ status: "done" });
    expect(eq).toHaveBeenCalledWith("id", "c1");
  });
});

describe("listSessionNotes", () => {
  it("joins the roster with saved notes and skips null ids", async () => {
    const roster = {
      data: [
        { student_id: "a", name: "가" },
        { student_id: null, name: null },
        { student_id: "b", name: "나" },
      ],
      error: null,
    };
    const notes = {
      data: [
        {
          student_id: "b",
          note: "x",
          needs_word_retest: false,
          needs_concept_review: true,
        },
      ],
      error: null,
    };
    from.mockImplementation(((table: string) => {
      if (table === "class_roster") {
        return {
          select: () => ({
            eq: () => ({ order: vi.fn().mockResolvedValue(roster) }),
          }),
        };
      }
      return { select: () => ({ eq: vi.fn().mockResolvedValue(notes) }) };
    }) as never);
    const out = await listSessionNotes("x", "c");
    expect(out).toEqual([
      {
        studentId: "a",
        name: "가",
        note: { note: null, wordRetest: false, conceptReview: false },
      },
      {
        studentId: "b",
        name: "나",
        note: { note: "x", wordRetest: false, conceptReview: true },
      },
    ]);
  });
});
