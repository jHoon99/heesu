import { describe, expect, it } from "vitest";
import { consentSchema, diffClassIds, guardianSchema } from "./detail";

describe("diffClassIds", () => {
  it("returns sorted add and remove", () => {
    expect(diffClassIds(["a", "b"], ["b", "c"])).toEqual({
      add: ["c"],
      remove: ["a"],
    });
    expect(diffClassIds(["z", "a"], [])).toEqual({
      add: [],
      remove: ["a", "z"],
    });
  });
  it("is empty for the same set", () => {
    expect(diffClassIds(["a", "b"], ["b", "a"])).toEqual({
      add: [],
      remove: [],
    });
  });
});

describe("guardianSchema", () => {
  const base = { school: "", guardianName: "", guardianPhone: "", memo: "" };
  it("turns empty values into null", () => {
    expect(guardianSchema.parse({ ...base, school: "   " })).toEqual({
      school: null,
      guardianName: null,
      guardianPhone: null,
      memo: null,
    });
  });
  it("accepts a formatted phone and rejects others", () => {
    expect(
      guardianSchema.parse({ ...base, guardianPhone: "010-1234-5678" })
        .guardianPhone,
    ).toBe("010-1234-5678");
    const r = guardianSchema.safeParse({ ...base, guardianPhone: "010-12-3" });
    expect(r.success ? "" : r.error.issues[0]?.message).toBe(
      "010-0000-0000 형식으로 입력해 주세요.",
    );
  });
  it("limits school and memo length", () => {
    const s = guardianSchema.safeParse({ ...base, school: "가".repeat(41) });
    expect(s.success ? "" : s.error.issues[0]?.message).toBe(
      "학교 이름은 40자까지 쓸 수 있어요.",
    );
    const m = guardianSchema.safeParse({ ...base, memo: "a".repeat(2001) });
    expect(m.success ? "" : m.error.issues[0]?.message).toBe(
      "메모는 2000자까지 쓸 수 있어요.",
    );
  });
});

describe("consentSchema", () => {
  const ok = {
    guardianName: "김엄마",
    method: "written",
    version: "2026-11",
    consentedAt: "2026-01-02T10:30",
  };
  const msg = (v: unknown) => {
    const r = consentSchema.safeParse(v);
    return r.success ? "" : r.error.issues[0]?.message;
  };
  it("converts to an ISO string", () => {
    const r = consentSchema.parse(ok);
    expect(r.consentedAt).toBe(new Date("2026-01-02T10:30").toISOString());
  });
  it("rejects a future date", () => {
    expect(msg({ ...ok, consentedAt: "2999-01-01T00:00" })).toBe(
      "동의 일시는 지금보다 앞이어야 해요.",
    );
  });
  it("rejects a blank version", () => {
    expect(msg({ ...ok, version: "  " })).toBe(
      "동의서 버전을 입력해 주세요. 예: 2026-11",
    );
  });
  it("rejects a missing method", () => {
    expect(msg({ ...ok, method: undefined })).toBe("동의 방법을 골라 주세요.");
  });
  it("rejects a blank guardian name", () => {
    expect(msg({ ...ok, guardianName: " " })).toBe(
      "보호자 이름을 1~20자로 입력해 주세요.",
    );
  });
});
