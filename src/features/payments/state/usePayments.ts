"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePayment,
  listPayableStudents,
  listPayments,
  listStudentPayments,
  savePayment,
} from "../data/payments";

export const paymentKeys = {
  all: ["payments"] as const,
  students: ["payments", "students"] as const,
  range: (from: string, to: string) => ["payments", "range", from, to] as const,
  student: (id: string) => ["payments", "student", id] as const,
};

export function usePayableStudents() {
  return useQuery({
    queryKey: paymentKeys.students,
    queryFn: listPayableStudents,
    refetchOnMount: "always",
  });
}

export function usePayments(months: string[]) {
  const from = months[0] ?? "";
  const to = months[months.length - 1] ?? "";
  return useQuery({
    queryKey: paymentKeys.range(from, to),
    queryFn: () => listPayments(from, to),
    refetchOnMount: "always",
    // 이전 달·다음 달로 캐시된 범위에 돌아와도 다시 읽는다. 그래야 isFetchedAfterMount가 켜져 칸을 열 수 있다.
    staleTime: 0,
  });
}

export function useStudentPayments(studentId: string) {
  return useQuery({
    queryKey: paymentKeys.student(studentId),
    queryFn: () => listStudentPayments(studentId),
    refetchOnMount: "always",
  });
}

export function useSavePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: Parameters<typeof savePayment>[0]) => savePayment(v),
    onSuccess: () => client.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}

export function useDeletePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => client.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}
