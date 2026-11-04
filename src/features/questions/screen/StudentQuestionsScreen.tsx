"use client";

import { useSearchParams } from "next/navigation";
import { Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useMyStudent } from "@/features/auth";
import { MyQuestionCard } from "../components/MyQuestionCard";
import { QuestionForm } from "../components/QuestionForm";
import { useMyQuestions } from "../state/useQuestions";
import { useQuestionsRealtime } from "../state/useQuestionsRealtime";

export function StudentQuestionsScreen() {
  const params = useSearchParams();
  const student = useMyStudent();
  const studentId = student.data?.id ?? null;
  const questions = useMyQuestions(studentId);
  // 이 화면이 열려 있을 때만 구독해요.
  useQuestionsRealtime(studentId ? { kind: "student", studentId } : null);
  const items = questions.data;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-h1 text-text">질문</h1>
      {studentId ? (
        <QuestionForm
          studentId={studentId}
          initialLink={{
            video: params.get("video"),
            session: params.get("session"),
          }}
        />
      ) : null}
      <h2 className="text-h3 text-text">내 질문</h2>
      {questions.isError && items === undefined ? (
        <Card>
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-body text-danger-700">
              {classifyError(questions.error).message}
            </p>
            <Button
              variant="secondary"
              block
              onClick={() => void questions.refetch()}
            >
              다시 시도
            </Button>
          </div>
        </Card>
      ) : items === undefined ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-body text-text-muted">
            아직 한 질문이 없어요. 궁금한 게 생기면 위에서 물어봐요.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((q) => (
            <li key={q.id} className="min-w-0">
              <MyQuestionCard question={q} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
