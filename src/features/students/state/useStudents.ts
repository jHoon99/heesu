import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStudent, resetStudentPassword } from "../data/functions";
import { getStudent, listStudents, updateStudent } from "../data/students";
import type { StudentCreateOutput, StudentEditOutput } from "../model/students";

export const studentKeys = {
  all: ["students"] as const,
  detail: (id: string) => ["students", id] as const,
};

export function useStudents() {
  return useQuery({ queryKey: studentKeys.all, queryFn: listStudents });
}

export function useStudent(id: string | null) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ""),
    queryFn: () => getStudent(id as string),
    enabled: id !== null,
    refetchOnMount: "always",
  });
}

// 초기 비밀번호는 mutation 변수로만 지나가고 결과(캐시)에는 id만 남아요.
export function useCreateStudent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentCreateOutput) => createStudent(input),
    onSuccess: () => client.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useUpdateStudent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: StudentEditOutput }) =>
      updateStudent(vars.id, vars.input),
    onSuccess: () => client.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useResetStudentPassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { studentId: string; password: string }) =>
      resetStudentPassword(vars.studentId, vars.password),
    onSuccess: () => client.invalidateQueries({ queryKey: studentKeys.all }),
  });
}
