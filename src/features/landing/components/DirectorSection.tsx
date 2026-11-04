import {
  BookOpen,
  GraduationCap,
  NotebookPen,
  Quote,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, Reveal, RevealGroup } from "@/design-system";
import { Blank } from "./Blank";
import { SectionHeading } from "./SectionHeading";

const PROFILE: {
  icon: LucideIcon;
  label: string;
  lines: string[];
  list?: boolean;
}[] = [
  {
    icon: GraduationCap,
    label: "EDUCATION",
    lines: ["전북대학교", "영어영문학과 졸업"],
  },
  {
    icon: BookOpen,
    label: "TEACHING FOCUS",
    lines: ["수능 대비", "중·고등 내신 대비"],
    list: true,
  },
  {
    icon: NotebookPen,
    label: "CLASS STYLE",
    lines: [
      "꼼꼼하고 명확한 개념 설명",
      "지문 중심의 탄탄한 독해력 향상",
      "학생별 수준에 맞춘 맞춤 피드백",
      "꾸준한 점검과 성장을 돕는 밀착 관리",
    ],
    list: true,
  },
];

export function DirectorSection() {
  return (
    <section id="director" className="scroll-mt-31">
      <Reveal className="flex flex-col gap-4">
        <SectionHeading eyebrow="DIRECTOR" title="원장 소개" />
        <Card className="flex flex-col gap-5 px-4 py-5">
          <div className="flex items-center gap-4">
            <div
              role="img"
              aria-label="원장 사진 자리"
              className="flex size-22 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-400 bg-bg-subtle text-text-muted"
            >
              <User size={24} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-caption text-text-muted">대표 원장</span>
              <span className="text-h3">
                <Blank>원장 이름</Blank>
              </span>
            </div>
          </div>
          <RevealGroup className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PROFILE.map(({ icon: Icon, label, lines, list }) => (
              <div
                key={label}
                className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-1 py-4 sm:flex sm:flex-col sm:items-center sm:gap-2.5 sm:px-2 sm:py-5 sm:text-center"
              >
                <span className="row-span-2 flex size-12 items-center justify-center rounded-full bg-primary-soft text-text-brand">
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="self-end font-serif text-caption font-semibold tracking-[0.12em] text-text-brand">
                  {label}
                </h3>
                {list ? (
                  <ul className="flex flex-col gap-1 text-body-sm">
                    {lines.map((line) => (
                      <li key={line}>
                        <span aria-hidden="true" className="text-brown-400">
                          ·{" "}
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm">
                    {lines.map((line, i) => (
                      <span key={line} className="sm:block">
                        {line}
                        {i < lines.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </RevealGroup>
          <figure className="flex flex-col gap-2 rounded-md bg-primary-soft p-5">
            <Quote
              size={24}
              strokeWidth={1.75}
              aria-hidden="true"
              className="fill-brown-400 text-brown-400"
            />
            <blockquote className="font-serif text-body-lg text-brown-900">
              <span className="font-sans text-body">
                <Blank>원장 인사말 한두 문장</Blank>
              </span>
            </blockquote>
          </figure>
        </Card>
      </Reveal>
    </section>
  );
}
