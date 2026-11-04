import { Phone } from "lucide-react";
import { buttonVariants, Card, cn, Reveal } from "@/design-system";
import { ConsultForm } from "@/features/consultations";
import type { SiteContent } from "@/features/site-content";
import { telHref } from "../model/links";
import { useIsFramed } from "../state/useIsFramed";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

export function ConsultSection({ content }: { content: SiteContent }) {
  const phone = content.contact.phone;
  const href = telHref(phone);
  // 관리자 미리보기에서는 진짜 상담 신청이 들어가지 않게 폼을 빼요.
  const framed = useIsFramed();
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
        {framed ? (
          <Card tone="subtle">
            <p className="text-body-sm text-text-muted">
              미리보기에서는 상담 신청 폼이 보이지 않아요. 실제 랜딩에서는 이
              자리에 신청 폼이 있어요.
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
