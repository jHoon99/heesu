"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutateFunction,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { useToast, type Attendance, type Homework } from "@/design-system";
import {
  getBoard,
  getDayProgress,
  listStudentRecords,
  setAttendance,
  setHomework,
} from "../data/attendance";
import { applyCell, type Board } from "../model/board";

export const attendanceKeys = {
  all: ["attendance"] as const,
  board: (classId: string) => ["attendance", "board", classId] as const,
  day: (date: string) => ["attendance", "day", date] as const,
  student: (id: string) => ["attendance", "student", id] as const,
};

/** 포인트 기능의 키 접두사(pointKeys.all과 같은 값). */
const POINTS_KEY = ["points"] as const;

export function useBoard(classId: string | null) {
  return useQuery({
    queryKey: attendanceKeys.board(classId ?? ""),
    queryFn: () => getBoard(classId as string),
    enabled: classId !== null,
  });
}

export function useDayProgress(date: string) {
  return useQuery({
    queryKey: attendanceKeys.day(date),
    queryFn: () => getDayProgress(date),
  });
}

export function useStudentRecords(studentId: string | null) {
  return useQuery({
    queryKey: attendanceKeys.student(studentId ?? ""),
    queryFn: () => listStudentRecords(studentId as string),
    enabled: studentId !== null,
  });
}

export type SetCellVars = {
  sessionId: string;
  studentId: string;
  field: "att" | "hw";
  value: Attendance | Homework;
  previous: Attendance | Homework;
  studentName: string;
  dateLabel: string;
};

function save(v: SetCellVars): Promise<void> {
  return v.field === "att"
    ? setAttendance(v.sessionId, v.studentId, v.value as Attendance)
    : setHomework(v.sessionId, v.studentId, v.value as Homework);
}

const noun = (field: "att" | "hw") => (field === "att" ? "출결을" : "숙제를");

export function useSetCell(classId: string) {
  const client = useQueryClient();
  const toast = useToast();
  const boardKey = attendanceKeys.board(classId);
  const mutationKey = ["attendance", "cell", classId] as const;
  // 같은 칸의 저장은 차례로, 다른 칸은 동시에 보내요(TanStack scope는 훅 하나에 고정이라 칸별로 못 써요).
  const chains = useRef(new Map<string, Promise<unknown>>());
  const mutateRef = useRef<UseMutateFunction<void, unknown, SetCellVars>>(
    () => undefined,
  );

  const mutation = useMutation({
    mutationKey,
    // 오프라인에서도 바로 실패시켜 칸을 되돌려요(기본 online 모드는 요청을 멈춰 둬요).
    networkMode: "always",
    mutationFn: (vars: SetCellVars) => {
      const key = `${vars.sessionId}:${vars.studentId}:${vars.field}`;
      const before = chains.current.get(key) ?? Promise.resolve();
      const run = before.catch(() => undefined).then(() => save(vars));
      chains.current.set(key, run);
      run
        .finally(() => {
          if (chains.current.get(key) === run) chains.current.delete(key);
        })
        .catch(() => undefined);
      return run;
    },
    onMutate: async (vars) => {
      await client.cancelQueries({ queryKey: boardKey });
      client.setQueryData<Board>(boardKey, (b) =>
        b
          ? {
              ...b,
              records: applyCell(
                b.records,
                vars.studentId,
                vars.sessionId,
                vars.field,
                vars.value,
              ),
            }
          : b,
      );
    },
    onError: (e, vars) => {
      client.setQueryData<Board>(boardKey, (b) => {
        if (!b) return b;
        const current =
          b.records[vars.studentId]?.[vars.sessionId]?.[vars.field];
        // 그 사이 같은 칸을 또 눌렀다면 나중 값을 지켜요.
        if (current !== vars.value) return b;
        return {
          ...b,
          records: applyCell(
            b.records,
            vars.studentId,
            vars.sessionId,
            vars.field,
            vars.previous,
          ),
        };
      });
      toast.show({
        tone: "danger",
        message: `${vars.studentName} ${vars.dateLabel} ${noun(vars.field)} 저장하지 못했어요. ${saveErrorMessage(e)}`,
      });
    },
    onSuccess: (_data, vars) => {
      toast.show({
        tone: "success",
        message: `${vars.studentName} ${vars.dateLabel} ${noun(vars.field)} 저장했어요.`,
        actionLabel: "되돌리기",
        onAction: () =>
          mutateRef.current({
            ...vars,
            value: vars.previous,
            previous: vars.value,
          }),
      });
    },
    onSettled: () => {
      // 마지막 저장이 끝날 때만 서버 값으로 다시 맞춰요(되돌린 칸도 서버 값과 같아져요).
      // 기다리지 않아요: 기다리는 동안 이 저장이 계속 "진행 중"으로 세어지면 다음 저장이 갱신을 건너뛰어요.
      if (client.isMutating({ mutationKey }) !== 1) return;
      void client.invalidateQueries({ queryKey: boardKey });
      void client.invalidateQueries({ queryKey: ["attendance", "day"] });
      void client.invalidateQueries({ queryKey: POINTS_KEY });
    },
  });
  const { mutate } = mutation;
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);
  return mutation;
}
