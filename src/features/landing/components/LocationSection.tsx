import { Copy, ExternalLink, Map } from "lucide-react";
import { Button, Reveal } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

const ROWS = [
  { label: "주소", blank: "주소" },
  { label: "주차", blank: "주차 안내" },
  { label: "대중교통", blank: "가까운 버스 정류장" },
];

const SECONDARY =
  "min-w-35 flex-[1_1_140px] border border-border-strong bg-bg-surface text-text hover:border-brown-300 hover:bg-bg-subtle";

export function LocationSection() {
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
          {ROWS.map(({ label, blank }) => (
            <div key={label} className="flex gap-3">
              <span className="w-18 shrink-0 text-text-muted">{label}</span>
              <Blank>{blank}</Blank>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={Copy} className={SECONDARY}>
            주소 복사
          </Button>
          <Button variant="ghost" icon={ExternalLink} className={SECONDARY}>
            지도 앱에서 보기
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
