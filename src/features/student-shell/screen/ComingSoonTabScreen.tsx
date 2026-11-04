import { Card } from "@/design-system";

export function ComingSoonTabScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 text-text">{title}</h1>
      <Card>
        <p className="text-body text-text-muted">{message}</p>
      </Card>
    </div>
  );
}
