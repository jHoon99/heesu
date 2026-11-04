import { useQuery } from "@tanstack/react-query";
import { consultationKeys } from "./useAdminConsultations";
import { countNewConsultations } from "../data/countNewConsultations";

export function useNewConsultationCount() {
  return useQuery({
    queryKey: consultationKeys.newCount,
    queryFn: countNewConsultations,
    staleTime: 60_000,
  });
}
