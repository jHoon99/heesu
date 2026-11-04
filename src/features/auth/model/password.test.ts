import { describe, expect, it } from "vitest";
import {
  newPasswordSchema,
  passwordErrorMessage,
  passwordSchema,
} from "./password";

describe("passwordSchema", () => {
  it("rejects fewer than 8 characters", () => {
    const r = passwordSchema.safeParse("1234567");
    expect(r.success ? null : r.error.issues[0]?.message).toBe(
      "비밀번호는 8자 이상으로 입력해 주세요.",
    );
  });

  it("rejects more than 72 UTF-8 bytes", () => {
    const r = passwordSchema.safeParse("가".repeat(25));
    expect(r.success ? null : r.error.issues[0]?.message).toBe(
      "비밀번호가 너무 길어요. 영문 기준 72자 이하로 줄여 주세요.",
    );
  });

  it("counts code points, not UTF-16 units", () => {
    expect(passwordSchema.safeParse("😀😀😀😀").success).toBe(false);
    expect(passwordSchema.safeParse("가나다라마바사아").success).toBe(true);
  });

  it("accepts exactly 72 bytes", () => {
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
  });
});

describe("newPasswordSchema", () => {
  it("reports a mismatch on the confirm path", () => {
    const r = newPasswordSchema.safeParse({
      password: "abcd1234",
      confirm: "abcd12345",
    });
    const issue = r.success ? null : r.error.issues[0];
    expect(issue?.path).toEqual(["confirm"]);
    expect(issue?.message).toBe(
      "두 비밀번호가 달라요. 같은 비밀번호를 한 번 더 입력해 주세요.",
    );
  });

  it("accepts matching passwords", () => {
    expect(
      newPasswordSchema.safeParse({ password: "abcd1234", confirm: "abcd1234" })
        .success,
    ).toBe(true);
  });
});

describe("passwordErrorMessage", () => {
  it("maps same_password", () => {
    expect(passwordErrorMessage({ code: "same_password" })).toBe(
      "지금 비밀번호와 다른 비밀번호를 입력해 주세요.",
    );
  });

  it("maps weak_password", () => {
    expect(passwordErrorMessage({ code: "weak_password" })).toBe(
      "너무 쉬운 비밀번호예요. 숫자와 영문을 섞어 8자 이상으로 바꿔 주세요.",
    );
  });

  it("falls back to the common classification", () => {
    expect(passwordErrorMessage(new Error("x"))).toBe(
      "문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
    );
  });
});
