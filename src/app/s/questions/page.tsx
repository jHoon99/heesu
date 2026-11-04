import { Suspense } from "react";
import { StudentQuestionsScreen } from "@/features/questions";

export default function StudentQuestions() {
  return (
    <Suspense>
      <StudentQuestionsScreen />
    </Suspense>
  );
}
