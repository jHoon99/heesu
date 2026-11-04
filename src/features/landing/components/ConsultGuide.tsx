import { BookOpen, MessageCircle, NotebookPen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** 강조 글자: 형광펜처럼 아래쪽만 칠해요. */
function Mark({ children }: { children: ReactNode }) {
  return (
    <mark className="bg-transparent bg-[linear-gradient(transparent_58%,var(--color-brown-200)_58%)] text-inherit">
      {children}
    </mark>
  );
}

const STEPS: { icon: LucideIcon; title: ReactNode; body: string }[] = [
  {
    icon: NotebookPen,
    title: (
      <>
        <Mark>레벨테스트 후</Mark> 상담 진행합니다.
      </>
    ),
    body: "학생의 현재 실력을 정확히 파악하기 위해 레벨테스트 후 학습 방향에 대한 상담을 진행합니다.",
  },
  {
    icon: MessageCircle,
    title: (
      <>
        방문 상담은 <Mark>사전 예약제</Mark>로 가능합니다.
      </>
    ),
    body: "아래에 상담 신청을 남겨 주시면 순차적으로 전화드립니다.",
  },
  {
    icon: BookOpen,
    title: (
      <>
        정확한 상담을 위한 <Mark>사전 준비</Mark>가 필요합니다.
      </>
    ),
    body: "방문 상담 시 학생이 현재 공부하고 있는 교재나 학교 시험지를 지참해 주시면 보다 구체적인 상담이 가능합니다.",
  },
];

/** 상담 안내: 약속 문구, 세 단계, 그리고 학원 분위기에 대한 당부예요. */
export function ConsultGuide() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-brown-200" />
          <span className="font-serif text-caption tracking-[0.3em] text-text-brand">
            HEESU ENGLISH
          </span>
          <span className="h-px flex-1 bg-brown-200" />
        </div>
        <h2 className="font-serif text-heading-serif text-brown-900 md:text-[34px] md:leading-[46px]">
          희수영어는
          <br />
          <Mark>꼼꼼하고 진심 있는 상담</Mark>을
          <br />
          약속드립니다.
        </h2>
        <p className="text-body text-text-muted">
          학생 한 명 한 명에게 꼭 필요한 수업을 제공하기 위해 모든 상담은{" "}
          <Mark>
            <span className="font-semibold text-text">사전 예약제</span>
          </Mark>
          로 운영합니다.
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-border border-y border-border">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={i} className="flex items-start gap-3 py-5 sm:gap-4">
            <span className="w-9 shrink-0 font-serif text-[28px] leading-[36px] text-text-brand italic">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-text-brand">
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="font-serif text-body-lg font-semibold text-brown-900">
                {title}
              </h3>
              <p className="text-body-sm text-text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <aside
        aria-label="안내 말씀"
        className="flex flex-col gap-2 rounded-lg border border-brown-200 bg-bg-subtle p-5"
      >
        <span className="font-serif text-caption tracking-[0.2em] text-text-brand">
          PLEASE NOTE
        </span>
        <p className="text-body-sm">
          희수영어는 서로를 존중하며, 배움에 집중할 수 있는 건강한 학습 분위기를
          중요하게 생각합니다.{" "}
          <strong className="font-semibold text-brown-900">
            기본적인 예의를 지키지 않거나, 학습 의지가 전혀 없는 학생은 등록이
            제한될 수 있습니다.
          </strong>
        </p>
        <p className="text-body-sm">
          처음부터 완벽한 학생을 원하는 것은 아닙니다. 배우려는 마음을 가지고
          꾸준히 노력하는 학생들을 끝까지 책임감 있게 지도하겠습니다.
        </p>
      </aside>
    </div>
  );
}
