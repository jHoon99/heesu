import { ChevronUp } from "lucide-react";
import type { SiteContent } from "@/features/site-content";
import { Blank } from "./Blank";

export function SiteFooter({ content }: { content: SiteContent }) {
  const { contact, legal } = content;
  const INFO: { label: string; value: string | null; blank: string }[] = [
    { label: "주소", value: contact.address, blank: "주소" },
    { label: "전화", value: contact.phone, blank: "전화번호" },
    { label: "대표", value: null, blank: "원장 이름" },
    { label: "학원 명칭", value: legal.academyName, blank: "학원 명칭" },
    { label: "학원 등록번호", value: legal.registrationNo, blank: "번호" },
    { label: "교습과목", value: legal.subjects, blank: "교습과목" },
    { label: "교습비", value: legal.tuitionNotice, blank: "교습비 안내" },
    { label: "사업자등록번호", value: null, blank: "번호" },
  ];

  return (
    <footer className="bg-brown-900 text-brown-100">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 pt-12 pb-28">
        <div className="flex items-center justify-between gap-4">
          <span className="font-serif text-h2 text-white">희수영어</span>
          <a
            href="#top"
            className="inline-flex min-h-11 items-center gap-1.5 text-body-sm text-brown-100 no-underline"
          >
            맨 위로
            <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
        <div className="flex flex-col gap-2 text-body-sm">
          {INFO.map(({ label, value, blank }) => (
            <span key={label}>
              {label}{" "}
              {value ? (
                <span>{value}</span>
              ) : (
                <Blank tone="dark">{blank}</Blank>
              )}
            </span>
          ))}
        </div>
        <div className="h-px bg-brown-100/16" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-brown-200">
          <a href="/privacy" className="font-semibold text-brown-100">
            개인정보처리방침
          </a>
          <span>© 2027 희수영어</span>
        </div>
      </div>
    </footer>
  );
}
