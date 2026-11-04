import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpRequest, UploadOptions } from "tus-js-client";
import { supabase } from "@/core/supabase/client";
import {
  newStoragePath,
  removeVideoObject,
  resumableEndpoint,
  startVideoUpload,
  VIDEO_BUCKET,
} from "./upload";

const tus = vi.hoisted(() => ({
  options: [] as unknown[],
  previous: [] as unknown[],
  find: vi.fn(),
  resume: vi.fn(),
  start: vi.fn(),
  abort: vi.fn(),
}));

vi.mock("tus-js-client", () => ({
  Upload: class {
    constructor(_file: unknown, options: unknown) {
      tus.options.push(options);
    }
    findPreviousUploads = tus.find;
    resumeFromPreviousUpload = tus.resume;
    start = tus.start;
    abort = tus.abort;
  },
}));

const remove = vi.fn();
vi.mock("@/core/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    storage: { from: vi.fn(() => ({ remove })) },
  },
}));
const getSession = vi.mocked(supabase.auth.getSession);

const PATH_RE = /^c1\/[0-9a-f-]{36}\.mp4$/;
const file = () => new File(["abc"], "a.mp4", { type: "video/mp4" });

function lastOptions(): UploadOptions {
  return tus.options.at(-1) as UploadOptions;
}

function fakeRequest() {
  const headers: Record<string, string> = {};
  const req = {
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
  } as unknown as HttpRequest;
  return { req, headers };
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("upload helpers", () => {
  it("builds the resumable endpoint without a double slash", () => {
    expect(resumableEndpoint("http://127.0.0.1:56321/")).toBe(
      "http://127.0.0.1:56321/storage/v1/upload/resumable",
    );
    expect(resumableEndpoint("https://x.supabase.co")).toBe(
      "https://x.supabase.co/storage/v1/upload/resumable",
    );
  });

  it("makes a class-scoped uuid path", () => {
    expect(VIDEO_BUCKET).toBe("videos");
    expect(newStoragePath("c1")).toMatch(PATH_RE);
  });
});

describe("startVideoUpload", () => {
  beforeEach(() => {
    tus.options.length = 0;
    tus.find.mockReset();
    tus.resume.mockReset();
    tus.start.mockReset();
    tus.abort.mockReset();
    getSession.mockReset();
    tus.find.mockResolvedValue([]);
    tus.abort.mockResolvedValue(undefined);
  });

  it("starts a new upload with the Supabase options", async () => {
    const onProgress = vi.fn();
    startVideoUpload(file(), "c1", onProgress);
    await flush();
    const o = lastOptions();
    expect(o.endpoint).toBe(
      "http://127.0.0.1:56321/storage/v1/upload/resumable",
    );
    expect(o.chunkSize).toBe(6291456);
    expect(o.retryDelays).toEqual([0, 3000, 5000, 10000, 20000]);
    expect(o.uploadDataDuringCreation).toBe(true);
    expect(o.removeFingerprintOnSuccess).toBe(true);
    expect(o.headers).toEqual({ "x-upsert": "false" });
    expect(o.metadata?.bucketName).toBe("videos");
    expect(o.metadata?.contentType).toBe("video/mp4");
    expect(o.metadata?.cacheControl).toBe("3600");
    expect(o.metadata?.objectName).toMatch(PATH_RE);
    expect(tus.resume).not.toHaveBeenCalled();
    expect(tus.start).toHaveBeenCalledTimes(1);
    o.onProgress?.(3, 10);
    expect(onProgress).toHaveBeenCalledWith(3, 10);
  });

  it("resumes a previous upload of the same class and resolves its path", async () => {
    const prev = { metadata: { objectName: "c1/old.mp4" } };
    tus.find.mockResolvedValue([
      { metadata: { objectName: "c2/other.mp4" } },
      prev,
    ]);
    const { done } = startVideoUpload(file(), "c1", vi.fn());
    await flush();
    expect(tus.resume).toHaveBeenCalledTimes(1);
    expect(tus.resume).toHaveBeenCalledWith(prev);
    expect(lastOptions().metadata?.objectName).toBe("c1/old.mp4");
    lastOptions().onSuccess?.({} as never);
    await expect(done).resolves.toBe("c1/old.mp4");
  });

  it("uses a new path when only another class has a previous upload", async () => {
    tus.find.mockResolvedValue([{ metadata: { objectName: "c2/other.mp4" } }]);
    const { done } = startVideoUpload(file(), "c1", vi.fn());
    await flush();
    expect(tus.resume).not.toHaveBeenCalled();
    const path = lastOptions().metadata?.objectName ?? "";
    expect(path).toMatch(PATH_RE);
    lastOptions().onSuccess?.({} as never);
    await expect(done).resolves.toBe(path);
  });

  it("rejects done with the tus error", async () => {
    const { done } = startVideoUpload(file(), "c1", vi.fn());
    await flush();
    const err = new Error("boom");
    lastOptions().onError?.(err);
    await expect(done).rejects.toBe(err);
  });

  it("puts the latest access token on every request", async () => {
    getSession
      .mockResolvedValueOnce({
        data: { session: { access_token: "t1" } },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: { session: { access_token: "t2" } },
        error: null,
      } as never);
    startVideoUpload(file(), "c1", vi.fn());
    await flush();
    const first = fakeRequest();
    const second = fakeRequest();
    await lastOptions().onBeforeRequest?.(first.req);
    await lastOptions().onBeforeRequest?.(second.req);
    expect(first.headers.authorization).toBe("Bearer t1");
    expect(second.headers.authorization).toBe("Bearer t2");
    expect(second.headers.apikey).toBe("test-publishable-key");
  });

  it("aborts and terminates the server upload", async () => {
    const { abort } = startVideoUpload(file(), "c1", vi.fn());
    await flush();
    await abort();
    expect(tus.abort).toHaveBeenCalledWith(true);
  });
});

describe("removeVideoObject", () => {
  beforeEach(() => {
    remove.mockReset();
  });

  it("removes the object from the videos bucket", async () => {
    remove.mockResolvedValue({ data: [{}], error: null });
    await removeVideoObject("c1/x.mp4");
    expect(supabase.storage.from).toHaveBeenCalledWith("videos");
    expect(remove).toHaveBeenCalledWith(["c1/x.mp4"]);
  });

  it("throws the storage error", async () => {
    const error = { message: "nope" };
    remove.mockResolvedValue({ data: null, error });
    await expect(removeVideoObject("c1/x.mp4")).rejects.toBe(error);
  });
});
