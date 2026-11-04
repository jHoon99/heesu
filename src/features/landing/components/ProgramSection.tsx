import type { ReactNode } from "react";
import { BookOpen, Bell, Clock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CountUp, Reveal, RevealGroup } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

// 정원이 정해지면 숫자를 넣어요. null이면 자리표시로 보여요.
const CLASS_CAPACITY: number | null = null;

interface Step {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const STEPS: Step[] = [
  {
    icon: Users,
    title: "반 구성",
    body: (
      <>
        반 정원{" "}
        {CLASS_CAPACITY === null ? (
          <Blank>정원</Blank>
        ) : (
          <CountUp value={CLASS_CAPACITY} from={1} />
        )}
        명
      </>
    ),
  },
  {
    icon: Clock,
    title: "수업 시간",
    body: (
      <>
        주 <Blank>횟수</Blank>회, 회당 <Blank>시간</Blank>분
      </>
    ),
  },
  {
    icon: BookOpen,
    title: "숙제 관리",
    body: <Blank>숙제 관리 방식</Blank>,
  },
  {
    icon: Bell,
    title: "학부모 안내",
    body: <Blank>출결·숙제 안내 방식</Blank>,
  },
];

export function ProgramSection() {
  return (
    <section id="program" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="PROGRAM" title="수업은 이렇게 진행돼요" />
        <RevealGroup className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} className="flex h-full flex-col gap-3 px-4 py-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft">
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-text-brand"
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="font-serif text-h3 font-normal text-brown-400 tabular-nums"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-h3">{title}</h3>
              <p className="text-body text-text-muted">{body}</p>
            </Card>
          ))}
        </RevealGroup>
      </Reveal>
    </section>
  );
}
