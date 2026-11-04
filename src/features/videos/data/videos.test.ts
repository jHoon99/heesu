import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { removeVideoObject } from "./upload";
import {
  createPlaybackUrl,
  createVideo,
  deleteVideo,
  listMyVideos,
  saveVideoProgress,
  updateVideo,
} from "./videos";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
vi.mock("./upload", () => ({ removeVideoObject: vi.fn() }));
const remove = vi.mocked(removeVideoObject);
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

function mockChain(methods: string[], result: unknown, log: string[] = []) {
  const builder: Record<string, unknown> = {};
  for (const method of methods) {
    builder[method] = (...args: unknown[]) => {
      log.push(`${method}(${args.map((a) => JSON.stringify(a)).join(",")})`);
      return method === "select" ? Promise.resolve(result) : builder;
    };
  }
  from.mockReturnValue(builder as never);
  return log;
}

describe("deleteVideo", () => {
  const video = { id: "v1", storagePath: "c1/x.mp4" };
  beforeEach(() => {
    from.mockReset();
    remove.mockReset();
  });

  it("deletes the row first, then the storage object", async () => {
    const log = mockChain(["delete", "eq", "select"], {
      data: [{ id: "v1" }],
      error: null,
    });
    remove.mockImplementation(async () => {
      log.push("remove");
    });
    await expect(deleteVideo(video)).resolves.toEqual({ fileRemoved: true });
    expect(log).toEqual([
      "delete()",
      'eq("id","v1")',
      'select("id")',
      "remove",
    ]);
    expect(remove).toHaveBeenCalledWith("c1/x.mp4");
  });

  it("throws SaveNotAppliedError on 0 rows and never touches storage", async () => {
    mockChain(["delete", "eq", "select"], { data: [], error: null });
    await expect(deleteVideo(video)).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("reports fileRemoved false when the object removal fails", async () => {
    mockChain(["delete", "eq", "select"], {
      data: [{ id: "v1" }],
      error: null,
    });
    remove.mockRejectedValue(new Error("x"));
    await expect(deleteVideo(video)).resolves.toEqual({ fileRemoved: false });
  });
});

describe("updateVideo", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("updates title and published_at", async () => {
    const log = mockChain(["update", "eq", "select"], {
      data: [{ id: "v1" }],
      error: null,
    });
    await updateVideo("v1", {
      title: "새 제목",
      publishedAt: "2026-11-09T00:00:00+09:00",
    });
    expect(log[0]).toBe(
      'update({"title":"새 제목","published_at":"2026-11-09T00:00:00+09:00"})',
    );
  });

  it("throws SaveNotAppliedError on 0 rows", async () => {
    mockChain(["update", "eq", "select"], { data: [], error: null });
    await expect(
      updateVideo("v1", { title: "a", publishedAt: "x" }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
  });
});

describe("student video data", () => {
  it("signs the playback url for 3 hours", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://x/y" },
      error: null,
    });
    const storage = vi.fn().mockReturnValue({ createSignedUrl });
    (supabase as unknown as { storage: unknown }).storage = { from: storage };
    await expect(createPlaybackUrl("c1/x.mp4")).resolves.toBe("https://x/y");
    expect(storage).toHaveBeenCalledWith("videos");
    expect(createSignedUrl).toHaveBeenCalledWith("c1/x.mp4", 10800);
  });

  it("floors progress and rejects a non-number result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 30, error: null });
    (supabase as unknown as { rpc: unknown }).rpc = rpc;
    await expect(saveVideoProgress("v1", 12.7, 30.2)).resolves.toBe(30);
    expect(rpc).toHaveBeenCalledWith("save_video_progress", {
      p_video_id: "v1",
      p_position_seconds: 12,
      p_watched_seconds: 30,
    });
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(saveVideoProgress("v1", 1, 1)).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });

  it("maps a row without a view record to 0 watched", async () => {
    const builder: Record<string, unknown> = {};
    const eqs: unknown[][] = [];
    builder.eq = (...a: unknown[]) => {
      eqs.push(a);
      return builder;
    };
    for (const m of ["select", "order"]) builder[m] = () => builder;
    builder.limit = () =>
      Promise.resolve({
        data: [
          {
            id: "v1",
            class_id: "c1",
            title: "t",
            storage_path: "c1/x.mp4",
            duration_seconds: 60,
            published_at: "2026-11-04T00:00:00+09:00",
            classes: { name: "A반" },
            video_views: [],
          },
        ],
        error: null,
      });
    from.mockReturnValue(builder as never);
    const [v] = await listMyVideos("st1");
    expect(eqs).toContainEqual(["video_views.student_id", "st1"]);
    expect(v).toMatchObject({
      className: "A반",
      watchedSeconds: 0,
      positionSeconds: 0,
    });
  });
});
