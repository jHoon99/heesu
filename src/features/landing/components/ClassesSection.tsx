import type { ReactNode } from "react";
import { Clock, GraduationCap, Users } from "lucide-react";
import { Card, CountUp, Reveal, RevealGroup } from "@/design-system";
import type { ClassInfo, SiteContent } from "@/features/site-content";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

type EmptyClass = { name: null; grades: null; schedule: null; capacity: null };
const EMPTY_CLASS: EmptyClass = {
  name: null,
  grades: null,
  schedule: null,
  capacity: null,
};
const PLACEHOLDER_CLASSES = [EMPTY_CLASS, EMPTY_CLASS, EMPTY_CLASS];

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 break-words">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </span>
  );
}

export function ClassesSection({ content }: { content: SiteContent }) {
  const cards: (ClassInfo | EmptyClass)[] =
    content.classes.length > 0 ? content.classes : PLACEHOLDER_CLASSES;
  return (
    <section id="classes" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="CLASSES" title="반과 시간표" />
        <RevealGroup className="flex flex-col gap-3">
          {cards.map((c, i) => (
            <Card key={i} className="flex h-full min-w-0 flex-col gap-2.5">
              <h3 className="text-h3 break-words">
                {c.name ?? <Blank>반 이름</Blank>}
              </h3>
              <div className="flex min-w-0 flex-wrap gap-2 text-body-sm text-text-muted">
                <Meta icon={GraduationCap}>
                  {c.grades ?? <Blank>학년</Blank>}
                </Meta>
                <Meta icon={Clock}>
                  {c.schedule ?? <Blank>요일·시간</Blank>}
                </Meta>
                <Meta icon={Users}>
                  정원{" "}
                  {c.capacity === null ? (
                    <Blank>n</Blank>
                  ) : (
                    <CountUp value={c.capacity} from={1} />
                  )}
                  명
                </Meta>
              </div>
            </Card>
          ))}
        </RevealGroup>
      </Reveal>
    </section>
  );
}
