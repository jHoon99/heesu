import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const CLINIC_KINDS = ["word_retest", "concept_review"] as const;
export type ClinicKind = (typeof CLINIC_KINDS)[number];
export const CLINIC_KIND_LABELS: Record<ClinicKind, string> = {
  word_retest: "단어 재시험",
  concept_review: "개념 보완",
};

export type ClinicStatus = "open" | "done";

export type ClinicItem = {
  id: string;
  studentId: string;
  sessionId: string | null;
  sessionDate: string | null;
  testDate: string | null;
  kind: ClinicKind;
  status: ClinicStatus;
  memo: string | null;
  doneAt: string | null;
  createdAt: string;
};

/** 클리닉 명단(전체 학생) 한 줄: 학생 이름이 붙어요. */
export type ClinicBoardItem = ClinicItem & {
  studentName: string;
  grade: string;
};

export type LessonNote = {
  note: string | null;
  wordRetest: boolean;
  conceptReview: boolean;
};

export const EMPTY_NOTE: LessonNote = {
  note: null,
  wordRetest: false,
  conceptReview: false,
};

/** 학생 한 명의 수업 한 번: 반 수업 내용 + 이 학생 메모. */
export type StudentLesson = {
  sessionId: string;
  date: string;
  className: string;
  summary: string | null;
  note: LessonNote;
};

/** 수업 한 번의 반 학생 한 명: 이름 + 메모. */
export type RosterNote = {
  studentId: string;
  name: string;
  note: LessonNote;
};

const NOTE_MESSAGE = "메모는 1000자까지 쓸 수 있어요.";
const MEMO_MESSAGE = "메모는 200자까지 쓸 수 있어요.";

/** 수업 메모 입력: 빈칸은 null로 저장해요. 줄바꿈은 돼요. */
export const noteTextSchema = z
  .string()
  .trim()
  .refine((v) => [...v].length <= 1000, NOTE_MESSAGE)
  .refine((v) => !hasControlChars(v, { multiline: true }), CONTROL_CHAR_MESSAGE)
  .transform((v) => (v === "" ? null : v));

export const clinicAddSchema = z.object({
  kind: z.enum(CLINIC_KINDS, { error: "종류를 골라 주세요." }),
  memo: z
    .string()
    .trim()
    .refine((v) => [...v].length <= 200, MEMO_MESSAGE)
    .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE)
    .transform((v) => (v === "" ? null : v)),
});
export type ClinicAddInput = z.input<typeof clinicAddSchema>;
export type ClinicAddOutput = z.output<typeof clinicAddSchema>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);

export function parseNote(row: unknown): LessonNote {
  if (!isRecord(row)) return EMPTY_NOTE;
  return {
    note: str(row.note),
    wordRetest: row.needs_word_retest === true,
    conceptReview: row.needs_concept_review === true,
  };
}

export function parseClinicRow(row: unknown): ClinicItem {
  const r = isRecord(row) ? row : {};
  const session = first(r.sessions);
  const test = first(r.test_results);
  return {
    id: String(r.id),
    studentId: String(r.student_id),
    sessionId: str(r.session_id),
    sessionDate:
      str(r.session_date) ?? (isRecord(session) ? str(session.date) : null),
    testDate: str(r.test_date) ?? (isRecord(test) ? str(test.taken_on) : null),
    kind: CLINIC_KINDS.find((k) => k === r.kind) ?? "word_retest",
    status: r.status === "done" ? "done" : "open",
    memo: str(r.memo),
    doneAt: str(r.done_at),
    createdAt: String(r.created_at),
  };
}

export function parseBoardRow(row: unknown): ClinicBoardItem {
  const r = isRecord(row) ? row : {};
  return {
    ...parseClinicRow(row),
    studentName: String(r.student_name),
    grade: String(r.grade),
  };
}

/** "2026-11-05" → "11/5" */
export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 출처: 수업에서 생긴 건 "11/5 수업", 테스트 미달은 "11/5 테스트", 직접 넣은 건 "직접 추가". */
export function clinicSource(item: ClinicItem): string {
  if (item.sessionDate) return `${shortDate(item.sessionDate)} 수업`;
  if (item.testDate) return `${shortDate(item.testDate)} 테스트`;
  return "직접 추가";
}

export function openCount(items: ClinicItem[]): number {
  return items.filter((i) => i.status === "open").length;
}

/** 저장할 값이 처음과 달라졌는지. 메모는 앞뒤 공백을 빼고 비교해요. */
export function noteChanged(
  initial: LessonNote,
  next: { note: string; wordRetest: boolean; conceptReview: boolean },
): boolean {
  return (
    (initial.note ?? "") !== next.note.trim() ||
    initial.wordRetest !== next.wordRetest ||
    initial.conceptReview !== next.conceptReview
  );
}
