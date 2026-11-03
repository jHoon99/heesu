"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useRef } from "react";
import { authKeys } from "@/core/auth";
import { markPasswordChanged, updateMyPassword } from "../data/student";

// 비밀번호 변경(updateUser)은 성공했는데 플래그 해제가 실패하면, 다시 시도할 때
// 같은 비밀번호로는 updateUser를 건너뛰어요(same_password 오류 방지).
// 다른 비밀번호를 새로 입력했다면 그 비밀번호를 다시 적용해요.
export function useChangeFirstPassword(): UseMutationResult<
  void,
  unknown,
  string
> {
  const queryClient = useQueryClient();
  const applied = useRef<string | null>(null);
  return useMutation({
    mutationFn: async (password: string) => {
      if (applied.current !== password) {
        await updateMyPassword(password);
        applied.current = password;
      }
      await markPasswordChanged();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...authKeys.all, "student"] }),
  });
}
