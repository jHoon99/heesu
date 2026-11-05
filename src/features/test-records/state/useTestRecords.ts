import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTestResult,
  deleteTestResult,
  listTestResults,
} from "../data/testRecords";
import type { TestOutput } from "../model/testRecords";

export const testKeys = {
  all: ["tests"] as const,
  student: (id: string) => ["tests", "student", id] as const,
};

export function useTestResults(studentId: string) {
  return useQuery({
    queryKey: testKeys.student(studentId),
    queryFn: () => listTestResults(studentId),
  });
}

export function useAddTestResult() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { studentId: string; input: TestOutput }) =>
      addTestResult(vars.studentId, vars.input),
    onSuccess: (_d, vars) =>
      client.invalidateQueries({ queryKey: testKeys.student(vars.studentId) }),
  });
}

export function useDeleteTestResult() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; studentId: string }) =>
      deleteTestResult(vars.id),
    onSettled: (_d, _e, vars) =>
      client.invalidateQueries({ queryKey: testKeys.student(vars.studentId) }),
  });
}
