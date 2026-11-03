import { Phone } from "lucide-react";
import { buttonVariants, cn, Reveal } from "@/design-system";
import { ConsultForm } from "@/features/consultations";
import type { SiteContent } from "@/features/site-content";
import { telHref } from "../model/links";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

export function ConsultSection({ content }: { content: SiteContent }) {
  const phone = content.contact.phone;
  const href = telHref(phone);
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
        <ConsultForm />
        <a
          href={href ?? undefined}
          aria-disabled={href ? undefined : "true"}
          className={cn(buttonVariants({ variant: "ghost", block: true }))}
        >
          <Phone size={16} aria-hidden="true" />
          전화로 문의하기
          {phone ? (
            <span className="tabular-nums">{phone}</span>
          ) : (
            <Blank>전화번호</Blank>
          )}
        </a>
      </Reveal>
    </section>
  );
}
