"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { authKeys, useAuthSession } from "@/core/auth";
import { getMyProfile, type MyProfile } from "../data/profile";

export function useMyProfile(): UseQueryResult<MyProfile | null> {
  const auth = useAuthSession();
  const userId = auth.status === "signedIn" ? auth.session.user.id : "";
  return useQuery({
    // authKeys.all 아래라 세션 이벤트 때 함께 무효화돼요.
    queryKey: [...authKeys.all, "student-profile", userId],
    queryFn: () => getMyProfile(userId),
    enabled: userId !== "",
  });
}
