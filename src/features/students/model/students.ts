import { z } from "zod";
import { LOGIN_ID_RE, passwordSchema } from "@/features/auth";
import { GRADES, type Grade } from "@/features/consultations";

export const STATUS_LABELS = {
  active: "재원",
  paused: "휴원",
  left: "퇴원",
} as const;

export type StudentStatus = keyof typeof STATUS_LABELS;
const STATUSES = ["active", "paused", "left"] as const;

const NAME_MESSAGE = "이름을 1~20자로 입력해 주세요.";
const GRADE_MESSAGE = "학년을 골라 주세요.";
const DATE_MESSAGE = "등록일을 2026-11-05 형식으로 입력해 주세요.";

export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const nameSchema = z
  .string()
  .trim()
  .refine((v) => {
    const n = [...v].length;
    return n >= 1 && n <= 20;
  }, NAME_MESSAGE);

const gradeSchema = z.enum(GRADES, { error: GRADE_MESSAGE });

const dateSchema = z.string().refine((v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, DATE_MESSAGE);

export const studentCreateSchema = z.object({
  loginId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      LOGIN_ID_RE,
      "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.",
    ),
  password: passwordSchema,
  name: nameSchema,
  grade: gradeSchema,
  joinedAt: dateSchema,
});
export type StudentCreateInput = z.input<typeof studentCreateSchema>;
export type StudentCreateOutput = z.output<typeof studentCreateSchema>;

export const studentEditSchema = z.object({
  name: nameSchema,
  grade: gradeSchema,
  status: z.enum(STATUSES),
  joinedAt: dateSchema,
});
export type StudentEditInput = z.input<typeof studentEditSchema>;
export type StudentEditOutput = z.output<typeof studentEditSchema>;

export type StudentSummary = {
  id: string;
  loginId: string;
  name: string;
  grade: Grade;
  status: StudentStatus;
  joinedAt: string;
  school: string | null;
  classes: { id: string; name: string }[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function schoolOf(value: unknown): string | null {
  const first = Array.isArray(value) ? (value[0] as unknown) : value;
  if (isRecord(first) && typeof first.school === "string") return first.school;
  return null;
}

function classesOf(value: unknown): { id: string; name: string }[] {
  if (!Array.isArray(value)) return [];
  const out: { id: string; name: string }[] = [];
  for (const m of value as unknown[]) {
    if (!isRecord(m)) continue;
    const c = Array.isArray(m.classes) ? (m.classes[0] as unknown) : m.classes;
    if (isRecord(c) && typeof c.id === "string" && typeof c.name === "string") {
      out.push({ id: c.id, name: c.name });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function parseStudentRow(row: unknown): StudentSummary {
  const r = isRecord(row) ? row : {};
  const grade = GRADES.find((g) => g === r.grade) ?? GRADES[0];
  const status = STATUSES.find((s) => s === r.status) ?? "active";
  return {
    id: String(r.id),
    loginId: String(r.login_id),
    name: String(r.name),
    grade,
    status,
    joinedAt: String(r.joined_at),
    school: schoolOf(r.student_private),
    classes: classesOf(r.class_members),
  };
}

const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export function filterStudents(
  list: StudentSummary[],
  status: StudentStatus | "all",
  query: string,
): StudentSummary[] {
  const q = squash(query);
  return list.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (q === "" || squash(s.name).includes(q) || squash(s.loginId).includes(q)),
  );
}

export type StudentFunctionCode =
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "login_taken"
  | "not_found"
  | "student_left"
  | "server";

const CODES: readonly StudentFunctionCode[] = [
  "unauthorized",
  "forbidden",
  "invalid",
  "login_taken",
  "not_found",
  "student_left",
  "server",
];

export function isStudentFunctionCode(v: unknown): v is StudentFunctionCode {
  return CODES.some((c) => c === v);
}

export const SERVER_MESSAGE =
  "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";

export class StudentFunctionError extends Error {
  readonly code: StudentFunctionCode;
  constructor(code: StudentFunctionCode, message: string) {
    super(message);
    this.name = "StudentFunctionError";
    this.code = code;
  }
}
