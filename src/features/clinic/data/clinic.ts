import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  parseBoardRow,
  parseClinicRow,
  parseNote,
  type ClinicAddOutput,
  type ClinicBoardItem,
  type ClinicItem,
  type ClinicStatus,
  type LessonNote,
  type RosterNote,
  type StudentLesson,
} from "../model/clinic";

const LESSON_LIMIT = 20;
const DONE_LIMIT = 30;

/** 학생이 지금 속한 반의 최근 수업과, 그 수업의 이 학생 메모. */
export async function listStudentLessons(
  studentId: string,
): Promise<StudentLesson[]> {
  const members = await supabase
    .from("class_members")
    .select("class_id")
    .eq("student_id", studentId);
  if (members.error) throw members.error;
  const classIds = members.data.map((m) => m.class_id);
  if (classIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, date, summary, classes(name), lesson_notes(note, needs_word_retest, needs_concept_review)",
    )
    .in("class_id", classIds)
    .eq("lesson_notes.student_id", studentId)
    .order("date", { ascending: false })
    .limit(LESSON_LIMIT);
  if (error) throw error;
  return data.map((s) => ({
    sessionId: s.id,
    date: s.date,
    className: s.classes?.name ?? "",
    summary: s.summary,
    note: parseNote(s.lesson_notes[0]),
  }));
}

/** 수업 한 번의 반 명단(퇴원생 제외)과 학생별 메모. */
export async function listSessionNotes(
  sessionId: string,
  classId: string,
): Promise<RosterNote[]> {
  const [roster, notes] = await Promise.all([
    supabase
      .from("class_roster")
      .select("student_id, name")
      .eq("class_id", classId)
      .order("name"),
    supabase
      .from("lesson_notes")
      .select("student_id, note, needs_word_retest, needs_concept_review")
      .eq("session_id", sessionId),
  ]);
  if (roster.error) throw roster.error;
  if (notes.error) throw notes.error;
  const byStudent = new Map(notes.data.map((n) => [n.student_id, n]));
  return roster.data.flatMap((r) =>
    r.student_id === null
      ? []
      : [
          {
            studentId: r.student_id,
            name: r.name ?? "",
            note: parseNote(byStudent.get(r.student_id)),
          },
        ],
  );
}

/** 메모 저장(있으면 고치기). 체크한 보완은 DB 트리거가 클리닉에 넣어요. */
export async function saveLessonNote(
  sessionId: string,
  studentId: string,
  note: LessonNote,
): Promise<void> {
  const { data, error } = await supabase
    .from("lesson_notes")
    .upsert(
      {
        session_id: sessionId,
        student_id: studentId,
        note: note.note,
        needs_word_retest: note.wordRetest,
        needs_concept_review: note.conceptReview,
      },
      { onConflict: "session_id,student_id" },
    )
    .select("session_id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}

const CLINIC_COLUMNS =
  "id, student_id, session_id, kind, status, memo, done_at, created_at, sessions(date), test_results(taken_on)";

export async function listStudentClinic(
  studentId: string,
): Promise<ClinicItem[]> {
  const { data, error } = await supabase
    .from("clinic_items")
    .select(CLINIC_COLUMNS)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(parseClinicRow);
}

const BOARD_COLUMNS =
  "id, student_id, session_id, kind, status, memo, done_at, created_at, student_name, grade, session_date, test_date";

/** 전체 클리닉 명단: 안 끝낸 것 전부(오래된 것 먼저) + 끝낸 것 최근 30개. 퇴원생은 view가 빼요. */
export async function listClinicBoard(): Promise<{
  open: ClinicBoardItem[];
  done: ClinicBoardItem[];
}> {
  const [open, done] = await Promise.all([
    supabase
      .from("clinic_board")
      .select(BOARD_COLUMNS)
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    supabase
      .from("clinic_board")
      .select(BOARD_COLUMNS)
      .eq("status", "done")
      .order("done_at", { ascending: false })
      .limit(DONE_LIMIT),
  ]);
  if (open.error) throw open.error;
  if (done.error) throw done.error;
  return {
    open: open.data.map(parseBoardRow),
    done: done.data.map(parseBoardRow),
  };
}

export async function setClinicStatus(
  id: string,
  status: ClinicStatus,
): Promise<void> {
  const { data, error } = await supabase
    .from("clinic_items")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}

export async function addClinicItem(
  studentId: string,
  input: ClinicAddOutput,
): Promise<void> {
  const { error } = await supabase
    .from("clinic_items")
    .insert({ student_id: studentId, kind: input.kind, memo: input.memo });
  if (error) throw error;
}
