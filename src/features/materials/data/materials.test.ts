import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  deleteMaterial,
  materialDownloadUrl,
  uploadMaterial,
} from "./materials";

vi.mock("@/core/supabase/client", () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}));
const from = vi.mocked(supabase.from);
const storageFrom = vi.mocked(supabase.storage.from);

const bucket = {
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  storageFrom.mockReturnValue(bucket as never);
  bucket.upload.mockResolvedValue({ data: {}, error: null });
  bucket.remove.mockResolvedValue({ data: [], error: null });
});

const CLASS = "20000000-0000-4000-8000-000000000001";

describe("uploadMaterial", () => {
  it("uploads with the MIME from the extension, then inserts the row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ insert } as never);
    const file = new File(["x"], "3과 본문.HWP");
    await uploadMaterial({ classId: CLASS, title: "3과", file });
    expect(storageFrom).toHaveBeenCalledWith("materials");
    const [path, , opts] = bucket.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${CLASS}/[0-9a-f-]{36}\\.hwp$`));
    expect(opts).toEqual({ contentType: "application/x-hwp", upsert: false });
    expect(insert).toHaveBeenCalledWith({
      class_id: CLASS,
      title: "3과",
      file_name: "3과 본문.HWP",
      storage_path: path,
      size_bytes: 1,
    });
  });

  it("removes the uploaded file when the row insert fails", async () => {
    const err = { code: "42501", message: "rls" };
    from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: err }),
    } as never);
    await expect(
      uploadMaterial({
        classId: CLASS,
        title: "t",
        file: new File(["x"], "a.pdf"),
      }),
    ).rejects.toBe(err);
    const [path] = bucket.upload.mock.calls[0]!;
    expect(bucket.remove).toHaveBeenCalledWith([path]);
  });

  it("does not upload an unsupported file", async () => {
    await expect(
      uploadMaterial({
        classId: CLASS,
        title: "t",
        file: new File(["x"], "a.exe"),
      }),
    ).rejects.toThrow();
    expect(bucket.upload).not.toHaveBeenCalled();
  });
});

describe("deleteMaterial", () => {
  it("throws SaveNotAppliedError on 0 rows and keeps the file", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    from.mockReturnValue({
      delete: () => ({ eq: () => ({ select }) }),
    } as never);
    await expect(
      deleteMaterial({ id: "m", storagePath: "p" }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
    expect(bucket.remove).not.toHaveBeenCalled();
  });
  it("removes the file after the row", async () => {
    const select = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "m" }], error: null });
    from.mockReturnValue({
      delete: () => ({ eq: () => ({ select }) }),
    } as never);
    await deleteMaterial({ id: "m", storagePath: "p" });
    expect(bucket.remove).toHaveBeenCalledWith(["p"]);
  });
});

describe("materialDownloadUrl", () => {
  it("asks for a 60-second URL that saves under the original name", async () => {
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://x" },
      error: null,
    });
    await expect(
      materialDownloadUrl({ storagePath: "p", fileName: "3과.pdf" }),
    ).resolves.toBe("https://x");
    expect(bucket.createSignedUrl).toHaveBeenCalledWith("p", 60, {
      download: "3과.pdf",
    });
  });
});
