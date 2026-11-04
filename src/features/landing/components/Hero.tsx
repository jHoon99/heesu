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
          className="h-40 w-auto"
        />
      </Reveal>
      <h1 className="font-serif text-display-serif md:text-[44px] md:leading-[56px]">
        <TextRise
          lines={["기본부터 깊이 있게,", "실력으로 증명합니다."]}
          delay={120}
        />
      </h1>
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
