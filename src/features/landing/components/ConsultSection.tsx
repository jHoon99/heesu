import { Phone } from "lucide-react";
import { buttonVariants, Card, cn, Reveal } from "@/design-system";
import { ConsultForm } from "@/features/consultations";
import type { SiteContent } from "@/features/site-content";
import { telHref } from "../model/links";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

export function ConsultSection({
  content,
  preview = false,
}: {
  content: SiteContent;
  /** 홈페이지 관리 화면: 진짜 신청이 들어가지 않게 폼 대신 안내를 보여요. */
  preview?: boolean;
}) {
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
        {preview ? (
          <Card tone="subtle">
            <p className="text-body-sm text-text-muted">
              실제 홈페이지에서는 이 자리에 상담 신청 폼이 있어요.
            </p>
          </Card>
        ) : (
          <ConsultForm />
        )}
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
