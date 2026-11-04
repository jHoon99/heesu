import { describe, expect, it } from "vitest";
import { SaveNotAppliedError, saveErrorMessage } from "./saveNotApplied";

describe("saveErrorMessage", () => {
  it("uses the SaveNotAppliedError message", () => {
    expect(saveErrorMessage(new SaveNotAppliedError())).toBe(
      "저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.",
    );
  });
  it("classifies other errors", () => {
    expect(saveErrorMessage({ code: "42501" })).toBe("접근 권한이 없어요.");
  });
});
