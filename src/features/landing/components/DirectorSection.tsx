import { Check, Quote, User } from "lucide-react";
import { Card, Reveal, RevealGroup } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

const CREDENTIALS = ["학력", "경력", "자격·수상"];

export function DirectorSection() {
  return (
    <section id="director" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="DIRECTOR" title="원장 소개" />
        <Card className="flex flex-col gap-5 px-4 py-5">
          <div className="flex items-center gap-4">
            <div
              role="img"
              aria-label="원장 사진 자리"
              className="flex size-22 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-400 bg-bg-subtle text-text-muted"
            >
              <User size={24} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-caption text-text-muted">대표 원장</span>
              <span className="text-h3">
                <Blank>원장 이름</Blank>
              </span>
            </div>
          </div>
          <RevealGroup className="flex flex-col gap-2.5 text-body">
            {CREDENTIALS.map((label) => (
              <div key={label} className="flex items-center gap-2.5">
                <Check
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="shrink-0 text-text-brand"
                />
                <Blank>{label}</Blank>
              </div>
            ))}
          </RevealGroup>
          <figure className="flex flex-col gap-2 rounded-md bg-primary-soft p-5">
            <Quote
              size={24}
              strokeWidth={1.75}
              aria-hidden="true"
              className="fill-brown-400 text-brown-400"
            />
            <blockquote className="font-serif text-body-lg text-brown-900">
              <span className="font-sans text-body">
                <Blank>원장 인사말 한두 문장</Blank>
              </span>
            </blockquote>
          </figure>
        </Card>
      </Reveal>
    </section>
  );
}
