import { Info } from "lucide-react";
import { Reveal } from "@/design-system";
import type { SiteContent } from "@/features/site-content";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

function PriceRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-h-13 min-w-0 items-center justify-between gap-3 border-b border-border last:border-b-0">
      <span className="text-body">{label}</span>
      <span className="min-w-0 text-body break-words tabular-nums">
        {value ?? <Blank>금액</Blank>}
      </span>
    </div>
  );
}

export function TuitionSection({ content }: { content: SiteContent }) {
  const { middle, high, note } = content.tuition;
  return (
    <section id="tuition" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="TUITION" title="수강료" />
        <div className="flex flex-col rounded-lg border border-border bg-bg-surface px-4 py-1">
          <PriceRow label="중등 (월)" value={middle} />
          <PriceRow label="고등 (월)" value={high} />
        </div>
        <p className="flex min-w-0 items-start gap-1.5 text-body-sm text-text-muted">
          <Info
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="mt-[3px] shrink-0"
          />
          <span className="min-w-0 break-words">
            수강료는 교육청에 신고한 금액이에요.{" "}
            {note ?? <Blank>추가 안내</Blank>}
          </span>
        </p>
      </Reveal>
    </section>
  );
}
