import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCounselNote,
  deleteCounselNote,
  listCounselNotes,
} from "../data/counselNotes";
import type { CounselOutput } from "../model/counselNotes";

export const counselKeys = {
  all: ["counsel-notes"] as const,
  student: (id: string) => ["counsel-notes", "student", id] as const,
};

export function useCounselNotes(studentId: string) {
  return useQuery({
    queryKey: counselKeys.student(studentId),
    queryFn: () => listCounselNotes(studentId),
  });
}

export function useAddCounselNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { studentId: string; input: CounselOutput }) =>
      addCounselNote(vars.studentId, vars.input),
    onSuccess: (_d, vars) =>
      client.invalidateQueries({
        queryKey: counselKeys.student(vars.studentId),
      }),
  });
}

export function useDeleteCounselNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; studentId: string }) =>
      deleteCounselNote(vars.id),
    onSettled: (_d, _e, vars) =>
      client.invalidateQueries({
        queryKey: counselKeys.student(vars.studentId),
      }),
  });
}
