import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createStudent, resetStudentPassword } from "../data/functions";
import { getStudent, listStudents, updateStudent } from "../data/students";
import type { StudentCreateOutput, StudentEditOutput } from "../model/students";

export const studentKeys = {
  all: ["students"] as const,
  detail: (id: string) => ["students", id] as const,
};

// 출결 표·포인트 순위는 학생 이름·상태에 따라 달라져요. 순환을 피해 글자로 적는다
// (attendanceKeys.all, pointKeys.all과 같은 값).
function invalidateStudentViews(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: studentKeys.all }),
    client.invalidateQueries({ queryKey: ["attendance"] }),
    client.invalidateQueries({ queryKey: ["points"] }),
  ]);
}

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

// 비밀번호는 mutation 변수로 지나가요. gcTime 0이라 끝나면 MutationCache에서 바로 지워지고,
// 화면도 처리 뒤 reset()을 불러요.
export function useCreateStudent() {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: (input: StudentCreateOutput) => createStudent(input),
    onSuccess: () => invalidateStudentViews(client),
  });
}

export function useUpdateStudent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: StudentEditOutput }) =>
      updateStudent(vars.id, vars.input),
    onSuccess: () => invalidateStudentViews(client),
  });
}

export function useResetStudentPassword() {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: (vars: { studentId: string; password: string }) =>
      resetStudentPassword(vars.studentId, vars.password),
    onSuccess: () => client.invalidateQueries({ queryKey: studentKeys.all }),
  });
}
