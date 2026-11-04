import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { createVideo } from "./videos";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

const input = {
  classId: "c1",
  title: "1단원",
  storagePath: "c1/x.mp4",
  durationSeconds: 13,
  publishedAt: "2026-11-09T00:00:00+09:00",
};

function mockInsert(result: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["insert", "select"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.single = () => Promise.resolve(result);
  from.mockReturnValue(builder as never);
  return calls;
}

describe("createVideo", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("inserts the row and returns its id", async () => {
    const calls = mockInsert({ data: { id: "v1" }, error: null });
    await expect(createVideo(input)).resolves.toEqual({ id: "v1" });
    expect(from).toHaveBeenCalledWith("videos");
    expect(calls).toEqual([
      {
        method: "insert",
        args: [
          {
            class_id: "c1",
            title: "1단원",
            storage_path: "c1/x.mp4",
            duration_seconds: 13,
            published_at: "2026-11-09T00:00:00+09:00",
          },
        ],
      },
      { method: "select", args: ["id"] },
    ]);
  });

  it("throws the insert error", async () => {
    const error = { code: "23514" };
    mockInsert({ data: null, error });
    await expect(createVideo(input)).rejects.toBe(error);
  });
});
