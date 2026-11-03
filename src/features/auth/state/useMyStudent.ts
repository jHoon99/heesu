"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { authKeys, useAuthSession } from "@/core/auth";
import { getMyStudent, type MyStudent } from "../data/student";

export const studentKeys = {
  // authKeys.all 아래라 세션 이벤트 때 함께 무효화돼요.
  me: (userId: string) => [...authKeys.all, "student", userId] as const,
};

export function useMyStudent(): UseQueryResult<MyStudent | null> {
  const auth = useAuthSession();
  const userId = auth.status === "signedIn" ? auth.session.user.id : "";
  return useQuery({
    queryKey: studentKeys.me(userId),
    queryFn: () => getMyStudent(userId),
    enabled: userId !== "",
  });
}
