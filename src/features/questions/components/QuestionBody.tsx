export function QuestionBody({ text }: { text: string }) {
  return (
    <p className="min-w-0 text-body break-words whitespace-pre-line text-text">
      {text}
    </p>
  );
}
