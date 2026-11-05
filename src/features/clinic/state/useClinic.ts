import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addClinicItem,
  listClinicBoard,
  listSessionNotes,
  listStudentClinic,
  listStudentLessons,
  saveLessonNote,
  setClinicStatus,
} from "../data/clinic";
import type {
  ClinicAddOutput,
  ClinicStatus,
  LessonNote,
} from "../model/clinic";

// 수업 메모가 바뀌면 클리닉도 바뀌어서(트리거) 한 뿌리 아래에 둬요.
export const clinicKeys = {
  all: ["clinic"] as const,
  board: ["clinic", "board"] as const,
  student: (id: string) => ["clinic", "student", id] as const,
  lessons: (id: string) => ["clinic", "lessons", id] as const,
  session: (id: string) => ["clinic", "session", id] as const,
};

export function useStudentLessons(studentId: string) {
  return useQuery({
    queryKey: clinicKeys.lessons(studentId),
    queryFn: () => listStudentLessons(studentId),
    refetchOnMount: "always",
  });
}

export function useSessionNotes(sessionId: string, classId: string) {
  return useQuery({
    queryKey: clinicKeys.session(sessionId),
    queryFn: () => listSessionNotes(sessionId, classId),
    refetchOnMount: "always",
  });
}

export function useStudentClinic(studentId: string) {
  return useQuery({
    queryKey: clinicKeys.student(studentId),
    queryFn: () => listStudentClinic(studentId),
  });
}

export function useClinicBoard() {
  return useQuery({
    queryKey: clinicKeys.board,
    queryFn: listClinicBoard,
    refetchOnMount: "always",
  });
}

function useInvalidateClinic() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: clinicKeys.all });
}

export function useSaveLessonNote() {
  const invalidate = useInvalidateClinic();
  return useMutation({
    mutationFn: (vars: {
      sessionId: string;
      studentId: string;
      note: LessonNote;
    }) => saveLessonNote(vars.sessionId, vars.studentId, vars.note),
    onSettled: invalidate,
  });
}

export function useSetClinicStatus() {
  const invalidate = useInvalidateClinic();
  return useMutation({
    mutationFn: (vars: { id: string; status: ClinicStatus }) =>
      setClinicStatus(vars.id, vars.status),
    onSettled: invalidate,
  });
}

export function useAddClinicItem() {
  const invalidate = useInvalidateClinic();
  return useMutation({
    mutationFn: (vars: { studentId: string; input: ClinicAddOutput }) =>
      addClinicItem(vars.studentId, vars.input),
    onSuccess: invalidate,
  });
}
