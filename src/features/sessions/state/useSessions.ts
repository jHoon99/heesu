import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSession,
  getSession,
  listClassSessions,
  startSession,
  updateSession,
} from "../data/sessions";
import type { SessionFormOutput } from "../model/sessions";

export const sessionKeys = {
  all: ["sessions"] as const,
  byClass: (classId: string) => ["sessions", "class", classId] as const,
  detail: (id: string) => ["sessions", id] as const,
};

export function useClassSessions(classId: string | null) {
  return useQuery({
    queryKey: sessionKeys.byClass(classId ?? ""),
    queryFn: () => listClassSessions(classId as string),
    enabled: classId !== null,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? ""),
    queryFn: () => getSession(id as string),
    enabled: id !== null,
    refetchOnMount: "always",
  });
}

export function useSaveSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string | null;
      classId: string;
      input: SessionFormOutput;
    }) => {
      if (vars.id === null) {
        await createSession(vars.classId, vars.input);
      } else {
        await updateSession(vars.id, vars.input);
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useStartSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      classId: string;
      date: string;
      homeworkDue: string | null;
    }) => startSession(vars.classId, vars.date, vars.homeworkDue),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: sessionKeys.all }),
        // attendanceKeys.all과 같은 값. attendance가 sessions를 쓰므로 순환을 피해 글자로 적는다.
        client.invalidateQueries({ queryKey: ["attendance"] }),
      ]),
  });
}
