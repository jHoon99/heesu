import { Bell } from "lucide-react";
import { Card } from "@/design-system";
import type { Notice } from "@/features/site-content";

export function NoticeBand({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <Card tone="subtle" className="flex items-start gap-3">
      <Bell
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-text-brand"
      />
      <div className="flex flex-col gap-1">
        <p className="text-label">{notice.title}</p>
        <p className="text-body-sm whitespace-pre-line text-text-muted">
          {notice.body}
        </p>
      </div>
    </Card>
  );
}
