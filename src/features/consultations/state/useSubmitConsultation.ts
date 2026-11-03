import { useMutation } from "@tanstack/react-query";
import { submitConsultation } from "../data/submitConsultation";

export function useSubmitConsultation() {
  return useMutation({ mutationFn: submitConsultation });
}
