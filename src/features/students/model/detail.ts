import { z } from "zod";

/** 현재 배정과 새 배정을 비교해 추가·삭제할 반 id를 (정렬해서) 돌려줘요. */
export function diffClassIds(
  current: string[],
  next: string[],
): { add: string[]; remove: string[] } {
  const cur = new Set(current);
  const nxt = new Set(next);
  return {
    add: [...nxt].filter((id) => !cur.has(id)).sort(),
    remove: [...cur].filter((id) => !nxt.has(id)).sort(),
  };
}

const SCHOOL_MESSAGE = "학교 이름은 40자까지 쓸 수 있어요.";
const PHONE_MESSAGE = "010-0000-0000 형식으로 입력해 주세요.";
const MEMO_MESSAGE = "메모는 2000자까지 쓸 수 있어요.";

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .refine((v) => [...v].length <= max, message)
    .transform((v) => (v === "" ? null : v));
}

export const guardianSchema = z.object({
  school: optionalText(40, SCHOOL_MESSAGE),
  guardianName: optionalText(20, "보호자 이름은 20자까지 쓸 수 있어요."),
  guardianPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^010-\d{4}-\d{4}$/.test(v), PHONE_MESSAGE)
    .transform((v) => (v === "" ? null : v)),
  memo: optionalText(2000, MEMO_MESSAGE),
});
export type GuardianInput = z.input<typeof guardianSchema>;
export type GuardianOutput = z.output<typeof guardianSchema>;

export const CONSENT_METHOD_LABELS = {
  written: "서면",
  phone: "전화",
  kakao: "카톡",
} as const;
export type ConsentMethod = keyof typeof CONSENT_METHOD_LABELS;
export const CONSENT_METHODS = ["written", "phone", "kakao"] as const;

const GUARDIAN_NAME_MESSAGE = "보호자 이름을 1~20자로 입력해 주세요.";
const VERSION_MESSAGE = "동의서 버전을 입력해 주세요. 예: 2026-11";
const FUTURE_MESSAGE = "동의 일시는 지금보다 앞이어야 해요.";

export const consentSchema = z.object({
  guardianName: z
    .string()
    .trim()
    .refine((v) => {
      const n = [...v].length;
      return n >= 1 && n <= 20;
    }, GUARDIAN_NAME_MESSAGE),
  method: z.enum(CONSENT_METHODS, { error: "동의 방법을 골라 주세요." }),
  version: z
    .string()
    .trim()
    .refine((v) => {
      const n = [...v].length;
      return n >= 1 && n <= 40;
    }, VERSION_MESSAGE),
  consentedAt: z
    .string()
    .refine((v) => v !== "" && !Number.isNaN(new Date(v).getTime()), {
      message: "동의 일시를 입력해 주세요.",
    })
    .refine((v) => new Date(v).getTime() <= Date.now(), FUTURE_MESSAGE)
    .transform((v) => new Date(v).toISOString()),
});
export type ConsentInput = z.input<typeof consentSchema>;
export type ConsentOutput = z.output<typeof consentSchema>;

export type ConsentRecord = {
  id: string;
  guardianName: string;
  method: ConsentMethod;
  version: string;
  consentedAt: string;
};

/** `datetime-local` 입력의 기본값(지금, 분 단위). */
export function nowLocalInput(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}
