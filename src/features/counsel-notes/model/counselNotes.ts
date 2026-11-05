import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const COUNSEL_METHODS = ["in_person", "phone", "kakao"] as const;
export type CounselMethod = (typeof COUNSEL_METHODS)[number];
export const COUNSEL_METHOD_LABELS: Record<CounselMethod, string> = {
  in_person: "대면",
  phone: "전화",
  kakao: "카톡",
};

export const COUNSEL_PARTIES = ["guardian", "student"] as const;
export type CounselParty = (typeof COUNSEL_PARTIES)[number];
export const COUNSEL_PARTY_LABELS: Record<CounselParty, string> = {
  guardian: "학부모",
  student: "학생",
};

export type CounselNote = {
  id: string;
  counseledOn: string;
  method: CounselMethod;
  party: CounselParty;
  body: string;
};

const BODY_MESSAGE = "상담 내용을 1~2000자로 입력해 주세요.";

export const counselSchema = z.object({
  counseledOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "상담 날짜를 골라 주세요."),
  method: z.enum(COUNSEL_METHODS, { error: "상담 방법을 골라 주세요." }),
  party: z.enum(COUNSEL_PARTIES, { error: "상담 대상을 골라 주세요." }),
  body: z
    .string()
    .trim()
    .refine((v) => {
      const n = [...v].length;
      return n >= 1 && n <= 2000;
    }, BODY_MESSAGE)
    .refine(
      (v) => !hasControlChars(v, { multiline: true }),
      CONTROL_CHAR_MESSAGE,
    ),
});
export type CounselInput = z.input<typeof counselSchema>;
export type CounselOutput = z.output<typeof counselSchema>;
