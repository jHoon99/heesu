import type { ReactNode } from "react";
import { ArrowRight, Clock, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, Reveal } from "@/design-system";
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

/** 블로그 대표 사진이 정해질 때까지 쓰는 예시 그림이에요. 카드 순서대로 돌아가며 써요. */
const SAMPLE_IMAGES = [
  "/about/sample-1.svg",
  "/about/sample-2.svg",
  "/about/sample-3.svg",
] as const;
const PLACEHOLDER_CARDS = 3;

export function storyNumber(i: number): string {
  return `INTRO ${String(i + 1).padStart(2, "0")}`;
}

function StoryCardBody({
  index,
  title,
  teaser,
}: {
  index: number;
  title: ReactNode;
  teaser: ReactNode;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음 */}
      <img
        src={SAMPLE_IMAGES[index % SAMPLE_IMAGES.length]}
        alt=""
        width={800}
        height={500}
        loading="lazy"
        draggable={false}
        className="aspect-[16/10] w-full rounded-lg bg-bg-subtle object-cover"
      />
      <h3 className="min-w-0 text-caption font-semibold break-words text-text-brand">
        <span className="tracking-[0.16em]">{storyNumber(index)}</span>
        <span aria-hidden="true" className="text-text-subtle">
          {" | "}
        </span>
        <span className="text-text">{title}</span>
      </h3>
      <p className="min-w-0 flex-1 text-body break-words whitespace-pre-line">
        {teaser}
      </p>
    </>
  );
}

const CARD =
  "flex h-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-bg-surface p-3 pb-4";

function StoryCard({ link, index }: { link: AboutLink; index: number }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        CARD,
        "transition-colors duration-(--dur-fast) ease-out hover:border-border-strong focus-visible:border-border-strong",
      )}
    >
      <StoryCardBody index={index} title={link.title} teaser={link.teaser} />
      <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-text-brand">
        이야기 읽기
        <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
    </a>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  return (
    <div className={CARD}>
      <StoryCardBody
        index={index}
        title={<Blank>블로그 글 제목</Blank>}
        teaser={<Blank>짧은 소개 2~3줄</Blank>}
      />
      <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-text-muted">
        이야기 읽기
        <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
    </div>
  );
}

/**
 * 블로그 이야기 카드: 휴대폰에서는 옆으로 밀어 보고(다음 카드가 살짝 보여요), 넓은 화면에서는 3칸으로 놓여요.
 */
function StoryCards({ items }: { items: AboutLink[] }) {
  const cell = "w-[80%] shrink-0 snap-start md:w-auto";
  return (
    <ul
      aria-label="희수영어 이야기"
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {items.length === 0
        ? Array.from({ length: PLACEHOLDER_CARDS }, (_, i) => (
            <li key={i} className={cell}>
              <PlaceholderCard index={i} />
            </li>
          ))
        : items.map((link, i) => (
            <li key={`${i}-${link.url}`} className={cell}>
              <StoryCard link={link} index={i} />
            </li>
          ))}
    </ul>
  );
}

export function AboutSection({ content }: { content: SiteContent }) {
  return (
    <section id="about" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="ABOUT" title="희수영어를 소개해요" />
        {content.about.intro ? (
          <p className="text-body-lg break-words whitespace-pre-line">
            {content.about.intro}
          </p>
        ) : null}
        <StoryCards items={content.about.items} />
        <div className="flex flex-col rounded-lg border border-border bg-bg-surface px-4 py-1">
          <InfoRow icon={Users} label="대상">
            중·고등학생
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
