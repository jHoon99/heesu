import type { ReactNode } from "react";
import { Clock, GraduationCap, Users } from "lucide-react";
import { Card, Reveal, RevealGroup } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

const PLACEHOLDER_CLASSES = [0, 1, 2];

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </span>
  );
}

export function ClassesSection() {
  return (
    <section id="classes" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="CLASSES" title="반과 시간표" />
        <RevealGroup className="flex flex-col gap-3">
          {PLACEHOLDER_CLASSES.map((n) => (
            <Card key={n} className="flex h-full flex-col gap-2.5">
              <h3 className="text-h3">
                <Blank>반 이름</Blank>
              </h3>
              <div className="flex flex-wrap gap-2 text-body-sm text-text-muted">
                <Meta icon={GraduationCap}>
                  <Blank>학년</Blank>
                </Meta>
                <Meta icon={Clock}>
                  <Blank>요일·시간</Blank>
                </Meta>
                <Meta icon={Users}>
                  정원 <Blank>n</Blank>명
                </Meta>
              </div>
            </Card>
          ))}
        </RevealGroup>
      </Reveal>
    </section>
  );
}
