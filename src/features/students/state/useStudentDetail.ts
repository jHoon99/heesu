import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classKeys } from "@/features/classes";
import {
  addConsent,
  getStudentPrivate,
  listConsents,
  saveStudentPrivate,
  setStudentClasses,
} from "../data/detail";
import type { ConsentOutput, GuardianOutput } from "../model/detail";
import { studentKeys } from "./useStudents";

const privateKey = (id: string) =>
  [...studentKeys.detail(id), "private"] as const;
const consentsKey = (id: string) =>
  [...studentKeys.detail(id), "consents"] as const;

export function useStudentPrivate(id: string | null) {
  return useQuery({
    queryKey: privateKey(id ?? ""),
    queryFn: () => getStudentPrivate(id as string),
    enabled: id !== null,
    refetchOnMount: "always",
  });
}

export function useConsents(id: string | null) {
  return useQuery({
    queryKey: consentsKey(id ?? ""),
    queryFn: () => listConsents(id as string),
    enabled: id !== null,
    refetchOnMount: "always",
  });
}

export function useSetStudentClasses() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; current: string[]; next: string[] }) =>
      setStudentClasses(vars.id, vars.current, vars.next),
    // 학생 목록의 반 열과 반 목록의 학생 수가 바뀌어요.
    // 일부만 적용되고 실패해도 서버 상태와 다시 맞춰요.
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: studentKeys.all }),
        client.invalidateQueries({ queryKey: classKeys.all }),
      ]);
    },
  });
}

export function useSaveStudentPrivate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: GuardianOutput }) =>
      saveStudentPrivate(vars.id, vars.input),
    onSuccess: (_d, vars) =>
      Promise.all([
        client.invalidateQueries({ queryKey: privateKey(vars.id) }),
        client.invalidateQueries({ queryKey: studentKeys.all }),
      ]),
  });
}

export function useAddConsent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: ConsentOutput }) =>
      addConsent(vars.id, vars.input),
    onSuccess: (_d, vars) =>
      client.invalidateQueries({ queryKey: consentsKey(vars.id) }),
  });
}
