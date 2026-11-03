import type { ReactNode } from "react";
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  MapPin,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-13 items-center gap-3 border-b border-border last:border-b-0">
      <Icon
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
        className="shrink-0 text-text-brand"
      />
      <span className="w-18 shrink-0 text-body-sm text-text-muted">
        {label}
      </span>
      <span className="text-body font-medium">{children}</span>
    </div>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="ABOUT" title="희수영어를 소개해요" />
        <div
          role="img"
          aria-label="학원 내부 사진 자리"
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-bg-subtle text-body-sm text-text-muted"
        >
          <ImageIcon size={24} strokeWidth={1.75} aria-hidden="true" />
          학원 내부 사진
        </div>
        <p className="text-body-lg">
          <Blank>학원 소개 글 2~3문장</Blank>
        </p>
        <div className="flex flex-col rounded-lg border border-border bg-bg-surface px-4 py-1">
          <InfoRow icon={Users} label="대상">
            중·고등학생
          </InfoRow>
          <InfoRow icon={Calendar} label="개원">
            <span className="tabular-nums">2027년 1월</span>
          </InfoRow>
          <InfoRow icon={Clock} label="운영 시간">
            <Blank>운영 시간</Blank>
          </InfoRow>
          <InfoRow icon={MapPin} label="위치">
            <Blank>주소</Blank>
          </InfoRow>
        </div>
      </Reveal>
    </section>
  );
}
