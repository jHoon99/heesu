"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { authKeys } from "@/core/auth";
import { markPasswordChanged, updateMyPassword } from "../data/student";

// 비밀번호 변경(updateUser)은 성공했는데 플래그 해제가 실패하면, 다시 시도할 때
// 입력을 고치지 않고 그대로 제출한 경우에만 updateUser를 건너뛰어요(same_password 오류 방지).
// 입력을 고쳤다면 그 비밀번호를 다시 적용해요. 비밀번호 문자열은 저장하지 않고
// 불리언 플래그만 들고 있어요. 호출하는 쪽은 입력의 onChange에서 markEdited()를 불러요.
export type ChangeFirstPassword = UseMutationResult<void, unknown, string> & {
  markEdited: () => void;
};

export function useChangeFirstPassword(): ChangeFirstPassword {
  const queryClient = useQueryClient();
  const passwordApplied = useRef(false);
  const editedSinceApply = useRef(false);
  const markEdited = useCallback(() => {
    editedSinceApply.current = true;
  }, []);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async (password: string) => {
      if (!passwordApplied.current || editedSinceApply.current) {
        passwordApplied.current = false;
        await updateMyPassword(password);
        passwordApplied.current = true;
        editedSinceApply.current = false;
      }
      await markPasswordChanged();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...authKeys.all, "student"] }),
  });
  return Object.assign(mutation, { markEdited });
}
