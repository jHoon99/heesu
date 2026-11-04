import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  planMfaStep,
  toAuthEmail,
  totpCodeSchema,
} from "./login";

const ID_MESSAGE =
  "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자예요. 다시 확인해 주세요.";

describe("toAuthEmail", () => {
  it.each([
    [
      "Haneul ",
      { ok: true, email: "haneul@student.heesu.internal", kind: "student" },
    ],
    [
      "min_jun2",
      { ok: true, email: "min_jun2@student.heesu.internal", kind: "student" },
    ],
    [
      " Admin@Example.Test ",
      { ok: true, email: "admin@example.test", kind: "admin" },
    ],
    [
      " Haneul@Student.Heesu.Internal",
      { ok: true, email: "haneul@student.heesu.internal", kind: "student" },
    ],
  ])("toAuthEmail(%j)", (input, out) =>
    expect(toAuthEmail(input)).toEqual(out),
  );

  it.each([
    "ab",
    "ha-neul",
    "하늘",
    "a".repeat(21),
    "",
    "ha-neul@student.heesu.internal",
  ])("rejects %j", (s) =>
    expect(toAuthEmail(s)).toEqual({ ok: false, message: ID_MESSAGE }),
  );
});

describe("planMfaStep", () => {
  it("verifies with the first verified totp factor", () =>
    expect(
      planMfaStep([
        { id: "u1", factor_type: "totp", status: "unverified" },
        { id: "v1", factor_type: "totp", status: "verified" },
        { id: "v2", factor_type: "totp", status: "verified" },
      ]),
    ).toEqual({ kind: "verify", factorId: "v1" }));

  it("clears leftover unverified totp factors before enrolling", () =>
    expect(
      planMfaStep([
        { id: "u1", factor_type: "totp", status: "unverified" },
        { id: "p1", factor_type: "phone", status: "unverified" },
      ]),
    ).toEqual({ kind: "enroll", unenrollIds: ["u1"] }));

  it("enrolls when there are no factors", () =>
    expect(planMfaStep([])).toEqual({ kind: "enroll", unenrollIds: [] }));
});

describe("authErrorMessage", () => {
  it.each([
    [
      { name: "AuthApiError", status: 400, code: "invalid_credentials" },
      "아이디 또는 비밀번호가 맞지 않아요. 다시 입력해 주세요.",
    ],
    [
      { code: "mfa_verification_failed" },
      "인증 코드가 맞지 않아요. 앱에 보이는 6자리 숫자를 다시 입력해 주세요.",
    ],
    [
      { code: "mfa_challenge_expired" },
      "코드 입력 시간이 지났어요. 앱의 새 숫자로 다시 입력해 주세요.",
    ],
    [{ status: 429 }, "로그인 시도가 너무 많아요. 5분 뒤 다시 시도해 주세요."],
    [
      { code: "over_request_rate_limit", status: 429 },
      "로그인 시도가 너무 많아요. 5분 뒤 다시 시도해 주세요.",
    ],
    [
      { code: "over_sms_send_rate_limit" },
      "로그인 시도가 너무 많아요. 5분 뒤 다시 시도해 주세요.",
    ],
    [new TypeError("Failed to fetch"), "네트워크 상태를 확인해 주세요."],
    ["weird", "문제가 생겼어요. 잠시 후 다시 시도해 주세요."],
  ])("%j → %j", (error, message) =>
    expect(authErrorMessage(error)).toBe(message),
  );
});

describe("totpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(totpCodeSchema.safeParse("123456").success).toBe(true);
    for (const bad of ["12345", "1234567", "12345a", " 123456"]) {
      const r = totpCodeSchema.safeParse(bad);
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("6자리 숫자를 입력해 주세요.");
    }
  });
});
