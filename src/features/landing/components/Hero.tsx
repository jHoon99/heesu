import { ArrowRight, Quote } from "lucide-react";
import { buttonVariants, cn, Reveal, TextRise } from "@/design-system";

/** 따옴표 장식: 원장 인사말과 같은 채운 따옴표 아이콘이에요. 여는 쪽은 뒤집어요. */
function QuoteMark({ close = false }: { close?: boolean }) {
  return (
    <Quote
      size={26}
      strokeWidth={1.5}
      aria-hidden="true"
      className={cn(
        "shrink-0 fill-brown-300 text-brown-300",
        close ? "self-end" : "rotate-180 self-start",
      )}
    />
  );
}

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 pt-8 text-center">
      <Reveal immediate delay={0} className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음 */}
        <img
          src="/brand/heesu-logo.svg"
          alt="희수영어 HEESU ENGLISH 로고"
          className="h-40 w-auto"
        />
      </Reveal>
      <div aria-hidden="true" className="h-px w-full max-w-80 bg-brown-200" />
      <div className="flex items-stretch gap-3">
        <QuoteMark />
        <h1 className="font-serif text-heading-serif text-brown-900 md:text-[34px] md:leading-[46px]">
          <TextRise
            lines={["기본부터 깊이 있게,", "실력으로 증명합니다."]}
            delay={120}
          />
        </h1>
        <QuoteMark close />
      </div>
      <Reveal immediate delay={320}>
        <p className="font-serif text-body text-text-muted">
          학생 한 명, 한 명의 가능성을 믿고
          <br />
          기본을 바탕으로 스스로 성장할 수 있도록
          <br />
          꼼꼼하고 탄탄하게 지도합니다.
        </p>
      </Reveal>
      <Reveal immediate delay={420} className="w-full max-w-110 pt-2">
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
