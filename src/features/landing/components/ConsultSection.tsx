import { Reveal } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

export function ConsultSection() {
  return (
    <section id="consult" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="CONTACT" title="상담 신청">
          <p className="text-body-lg text-text-muted">
            남겨 주시면 원장이 직접 연락드려요. 상담 가능 시간은{" "}
            <span className="text-body">
              <Blank>상담 시간</Blank>
            </span>
            이에요.
          </p>
        </SectionHeading>
      </Reveal>
    </section>
  );
}
