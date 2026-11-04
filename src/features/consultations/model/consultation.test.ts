import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  consultFormSchema,
  formatPhoneInput,
  SubmitConsultationError,
  submitErrorMessage,
} from "./consultation";

describe("formatPhoneInput", () => {
  it.each([
    ["01012345678", "010-1234-5678"],
    ["010-1234-5678", "010-1234-5678"],
    ["010 1234 5678", "010-1234-5678"],
    ["+82 10-1234-5678", "010-1234-5678"],
    ["0101234", "010-1234"],
    ["0101", "010-1"],
    ["010", "010"],
    ["010123456789999", "010-1234-5678"],
    ["abc", ""],
  ])("formatPhoneInput(%j) = %j", (raw, out) =>
    expect(formatPhoneInput(raw)).toBe(out),
  );
});

const valid = {
  parentName: "홍길동",
  phone: "010-1234-5678",
  grade: "중2",
  message: "",
  guardianConfirmed: true,
  privacyAgreed: true,
};

function firstIssue(patch: Record<string, unknown>) {
  const r = consultFormSchema.safeParse({ ...valid, ...patch });
  return r.success ? null : r.error.issues[0]?.message;
}

describe("consultFormSchema", () => {
  it("accepts valid input and normalizes", () => {
    const r = consultFormSchema.safeParse({
      ...valid,
      parentName: "  홍길동 ",
      message: " 문법이 약해요 ",
    });
    expect(r.success && r.data.parentName).toBe("홍길동");
    expect(r.success && r.data.message).toBe("문법이 약해요");
  });

  it("turns a blank message into null", () => {
    const r = consultFormSchema.safeParse({ ...valid, message: "  " });
    expect(r.success && r.data.message).toBeNull();
  });

  it.each([
    [{ parentName: "  " }, "학부모 성함을 입력해 주세요."],
    [{ parentName: "가".repeat(41) }, "성함은 40자까지 입력할 수 있어요."],
    [{ phone: "010-1234" }, "010-0000-0000 형식으로 입력해 주세요."],
    [{ grade: "" }, "학생 학년을 골라 주세요."],
    [{ message: "가".repeat(1001) }, "궁금한 점은 1000자까지 쓸 수 있어요."],
    [
      { guardianConfirmed: false },
      "보호자만 신청할 수 있어요. 확인란을 체크해 주세요.",
    ],
    [{ privacyAgreed: false }, "개인정보 수집·이용에 동의해 주세요."],
  ])("rejects %j", (patch, message) => {
    expect(firstIssue(patch)).toBe(message);
  });
});

describe("submitErrorMessage server message", () => {
  it("shows the server message for invalid only", () => {
    expect(
      submitErrorMessage(new SubmitConsultationError("invalid", "서버 안내")),
    ).toBe("서버 안내");
    expect(
      submitErrorMessage(new SubmitConsultationError("captcha", "서버 안내")),
    ).not.toBe("서버 안내");
  });
});

describe("submitErrorMessage", () => {
  it.each([
    [
      "captcha",
      "자동 입력 방지 확인이 끝나지 않았어요. 확인 상자를 다시 눌러 주세요.",
    ],
    [
      "rate_limited",
      "오늘은 이 번호로 더 신청할 수 없어요. 전화로 문의해 주세요.",
    ],
    ["invalid", "입력한 내용을 다시 확인해 주세요."],
    [
      "server",
      "신청을 보내지 못했어요. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
    ],
    [
      "forbidden_origin",
      "신청을 보내지 못했어요. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
    ],
  ] as const)("%s", (code, message) => {
    expect(submitErrorMessage(new SubmitConsultationError(code))).toBe(message);
  });

  it("delegates other errors to classifyError", () => {
    expect(submitErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "네트워크 상태를 확인해 주세요.",
    );
  });
});

describe("CONSENT_VERSION", () => {
  it("is accepted by the submit-consultation Edge Function", () => {
    const src = readFileSync(
      join(process.cwd(), "supabase/functions/submit-consultation/handler.ts"),
      "utf8",
    );
    const list = /ACCEPTED_CONSENT_VERSIONS[^=]*=\s*\[([^\]]*)\]/.exec(src);
    expect(list).not.toBeNull();
    const versions = [...(list?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(versions).toContain(CONSENT_VERSION);
  });
});
