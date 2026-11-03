"use client";

import { Copy, ExternalLink, Map } from "lucide-react";
import { Button, buttonVariants, cn, Reveal, useToast } from "@/design-system";
import type { SiteContent } from "@/features/site-content";
import { naverMapHref } from "../model/links";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

const OTHER_ROWS = [
  { label: "주차", blank: "주차 안내" },
  { label: "대중교통", blank: "가까운 버스 정류장" },
];

const SECONDARY = "min-w-35 flex-[1_1_140px]";

export function LocationSection({ content }: { content: SiteContent }) {
  const { show } = useToast();
  const address = content.contact.address;
  const mapHref = naverMapHref(address);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      show({ tone: "success", message: "주소를 복사했어요." });
    } catch {
      show({
        tone: "danger",
        message: "복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.",
      });
    }
  };

  return (
    <section id="location" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="LOCATION" title="오시는 길" />
        <div
          role="img"
          aria-label="지도 자리"
          className="flex h-55 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-bg-subtle text-body-sm text-text-muted"
        >
          <Map size={24} strokeWidth={1.75} aria-hidden="true" />
          지도 (주소 확정 후)
        </div>
        <div className="flex flex-col gap-3 text-body">
          <div className="flex gap-3">
            <span className="w-18 shrink-0 text-text-muted">주소</span>
            {address ?? <Blank>주소</Blank>}
          </div>
          {OTHER_ROWS.map(({ label, blank }) => (
            <div key={label} className="flex gap-3">
              <span className="w-18 shrink-0 text-text-muted">{label}</span>
              <Blank>{blank}</Blank>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={Copy}
            className={SECONDARY}
            disabled={!address}
            onClick={copy}
          >
            주소 복사
          </Button>
          {mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                SECONDARY,
              )}
            >
              <ExternalLink size={16} aria-hidden="true" />
              지도 앱에서 보기
            </a>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
