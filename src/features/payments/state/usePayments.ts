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
