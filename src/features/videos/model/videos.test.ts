import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE } from "@/core/text";
import {
  formatDuration,
  isMp4File,
  publishedAtFromDate,
  VIDEO_TITLE_MAX,
  videoFormSchema,
} from "./videos";

const valid = { title: "1단원", classId: "c1", publishedDate: "2026-11-09" };

function firstMessage(input: Record<string, unknown>): string | undefined {
  const r = videoFormSchema.safeParse({ ...valid, ...input });
  return r.success ? undefined : r.error.issues[0]?.message;
}

describe("formatDuration", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(760)).toBe("12:40");
    expect(formatDuration(3723)).toBe("1:02:03");
  });
});

describe("publishedAtFromDate", () => {
  it("is the Seoul midnight of the date", () => {
    expect(publishedAtFromDate("2026-11-09")).toBe("2026-11-09T00:00:00+09:00");
  });
});

describe("videoFormSchema", () => {
  it("rejects a blank title", () => {
    expect(firstMessage({ title: "  " })).toBe("제목을 입력해 주세요.");
  });

  it("rejects a title over the limit", () => {
    expect(VIDEO_TITLE_MAX).toBe(100);
    expect(firstMessage({ title: "가".repeat(101) })).toBe(
      "제목은 100자까지 쓸 수 있어요.",
    );
  });

  it("rejects control characters", () => {
    expect(firstMessage({ title: "제목\u0007" })).toBe(CONTROL_CHAR_MESSAGE);
  });

  it("trims the title", () => {
    const r = videoFormSchema.parse({ ...valid, title: "  1단원  " });
    expect(r.title).toBe("1단원");
  });

  it("requires a class and a date", () => {
    expect(firstMessage({ classId: "" })).toBe("반을 골라 주세요.");
    expect(
      videoFormSchema.safeParse({ ...valid, publishedDate: "" }).success,
    ).toBe(false);
  });
});

describe("isMp4File", () => {
  it("accepts mp4 by type or extension", () => {
    expect(isMp4File(new File(["x"], "a.MP4", { type: "" }))).toBe(true);
    expect(isMp4File(new File(["x"], "a", { type: "video/mp4" }))).toBe(true);
    expect(
      isMp4File(new File(["x"], "a.mov", { type: "video/quicktime" })),
    ).toBe(false);
  });
});
