import { Badge, Card } from "@/design-system";
import {
  formatQuestionTime,
  linkLabel,
  type Question,
} from "../model/questions";
import { QuestionBody } from "./QuestionBody";

export function MyQuestionCard({ question }: { question: Question }) {
  return (
    <Card className="min-w-0">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-caption text-text-muted">
            {formatQuestionTime(question.createdAt)}
          </p>
          {question.link ? (
            <Badge tone="neutral">{linkLabel(question.link)}</Badge>
          ) : null}
        </div>
        <QuestionBody text={question.body} />
        {question.answers.length > 0 ? (
          question.answers.map((a) => (
            <div key={a.id} className="min-w-0 rounded-lg bg-bg-subtle p-3">
              <p className="text-caption text-text-muted">
                원장님 답변 · {formatQuestionTime(a.createdAt)}
              </p>
              <QuestionBody text={a.body} />
            </div>
          ))
        ) : (
          <p className="text-body-sm text-text-muted">
            아직 답변을 기다리고 있어요.
          </p>
        )}
      </div>
    </Card>
  );
}
