import { useQuery } from "@tanstack/react-query";
import { countNewConsultations } from "../data/countNewConsultations";

export function useNewConsultationCount() {
  return useQuery({
    queryKey: ["consultations", "newCount"],
    queryFn: countNewConsultations,
    staleTime: 60_000,
  });
}
