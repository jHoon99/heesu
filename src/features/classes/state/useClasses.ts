import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClass,
  getClass,
  listClasses,
  updateClass,
} from "../data/classes";
import type { ClassFormOutput } from "../model/classes";

export const classKeys = {
  all: ["classes"] as const,
  detail: (id: string) => ["classes", id] as const,
};

export function useClasses() {
  return useQuery({ queryKey: classKeys.all, queryFn: listClasses });
}

export function useClass(id: string | null) {
  return useQuery({
    queryKey: classKeys.detail(id ?? ""),
    queryFn: () => getClass(id as string),
    enabled: id !== null,
  });
}

export function useSaveClass() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string | null; input: ClassFormOutput }) => {
      if (vars.id === null) {
        await createClass(vars.input);
      } else {
        await updateClass(vars.id, vars.input);
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: classKeys.all }),
  });
}
