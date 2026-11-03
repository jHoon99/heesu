"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { updateMyPassword } from "../data/student";

// 이미 로그인된 기기에서 바꾸는 흐름이라 현재 비밀번호는 묻지 않아요.
// 비밀번호가 캐시에 남지 않도록 gcTime 0이고, 호출하는 쪽이 시도마다 reset()해요.
export function useChangePassword(): UseMutationResult<void, unknown, string> {
  return useMutation({
    gcTime: 0,
    mutationFn: (password: string) => updateMyPassword(password),
  });
}
