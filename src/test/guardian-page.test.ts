import { describe, expect, it } from "vitest";
import { metadata } from "@/app/g/page";

describe("/g page metadata", () => {
  it("is not indexed and sends no referrer", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
