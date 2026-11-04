import type { ReactNode } from "react";
import { Calendar, Clock, ExternalLink, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/design-system";
import type { AboutLink, SiteContent } from "@/features/site-content";
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

/** 카드 아래에 보여 줄 주소의 사이트 이름이에요. www.는 빼요. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const CARD =
  "flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-border bg-bg-surface px-4 py-3";

function LinkCard({ link }: { link: AboutLink }) {
  const host = linkHost(link.url);
  return (
    <li>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${CARD} transition-colors duration-(--dur-fast) ease-out hover:border-border-strong focus-visible:border-border-strong`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium break-words">
            {link.title}
          </span>
          {host ? (
            <span className="text-caption break-all text-text-muted">
              {host}
            </span>
          ) : null}
        </span>
        <ExternalLink
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="shrink-0 text-text-brand"
        />
      </a>
    </li>
  );
}

function AboutLinks({ items }: { items: AboutLink[] }) {
  if (items.length === 0)
    return (
      <div className={CARD}>
        <Blank>소개 글 링크</Blank>
      </div>
    );
  return (
    <ul className="flex flex-col gap-2">
      {items.map((link, i) => (
        <LinkCard key={`${i}-${link.url}`} link={link} />
      ))}
    </ul>
  );
}

export function AboutSection({ content }: { content: SiteContent }) {
  return (
    <section id="about" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="ABOUT" title="희수영어를 소개해요" />
        <p className="text-body-lg break-words whitespace-pre-line">
          {content.about.intro ?? <Blank>학원 소개 글 2~3문장</Blank>}
        </p>
        <AboutLinks items={content.about.items} />
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
            {content.contact.address ?? <Blank>주소</Blank>}
          </InfoRow>
        </div>
      </Reveal>
    </section>
  );
}
