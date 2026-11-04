import { ArrowRight } from "lucide-react";
import { buttonVariants, Reveal, TextRise } from "@/design-system";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-5 pt-8 text-center">
      <Reveal immediate delay={0} className="flex flex-col items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음 */}
        <img
          src="/brand/heesu-logo.svg"
          alt="희수영어 HEESU ENGLISH 로고"
          className="mb-1 h-40 w-auto"
        />
        <span className="inline-flex h-7 items-center gap-2 rounded-full bg-primary-soft px-3 text-caption font-semibold text-text-brand">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-focus-ring"
          />
          2027년 1월 개원 · 전주 중·고등 영어
        </span>
      </Reveal>
      <h1 className="font-serif text-display-serif md:text-[44px] md:leading-[56px]">
        <TextRise lines={["한 문장씩,", "깊이 있게."]} delay={120} />
      </h1>
      <Reveal immediate delay={420}>
        <p className="max-w-110 text-body-lg text-text-muted">
          희수영어는 전주의 중·고등학생을 위한 영어 학원이에요. 2027년 1월에
          문을 열어요.
        </p>
      </Reveal>
      <Reveal immediate delay={560} className="w-full max-w-110 pt-2">
        <a
          href="#consult"
          className={buttonVariants({ size: "lg", block: true })}
        >
          상담 신청하기
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </Reveal>
    </section>
  );
}
