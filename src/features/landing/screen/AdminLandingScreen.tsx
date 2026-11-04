"use client";

import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import {
  LandingEditModal,
  useSiteContent,
  type LandingSection,
} from "@/features/site-content";
import { AboutSection } from "../components/AboutSection";
import { ClassesSection } from "../components/ClassesSection";
import { ConsultSection } from "../components/ConsultSection";
import { DirectorSection } from "../components/DirectorSection";
import { Hero } from "../components/Hero";
import { LeafDivider } from "../components/LeafDivider";
import { LocationSection } from "../components/LocationSection";
import { NoticeBand } from "../components/NoticeBand";
import { ProgramSection } from "../components/ProgramSection";
import { SiteFooter } from "../components/SiteFooter";
import { TuitionSection } from "../components/TuitionSection";
import { EditableRegion } from "../components/admin/EditableRegion";

/**
 * 홈페이지 관리: 실제 홈페이지를 그대로 그리고, 고칠 수 있는 부분을 누르면 수정 창을 열어요.
 * 저장하면 같은 캐시를 다시 읽어서 이 화면과 실제 홈페이지가 함께 바뀌어요.
 */
export function AdminLandingScreen() {
  const { content } = useSiteContent();
  const [editing, setEditing] = useState<LandingSection | null>(null);
  const edit = (s: LandingSection) => () => setEditing(s);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-h2 text-text">홈페이지 관리</h1>
          <p className="mt-1 text-body-sm text-text-muted">
            학부모가 보는 홈페이지 그대로예요. 점선 상자를 누르면 그 부분을 고칠
            수 있고, 저장하면 바로 반영돼요. 소개 글처럼 상자가 없는 부분은
            고정된 글이라 개발 담당에게 요청해 주세요.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center gap-1 text-body-sm text-text-brand"
        >
          실제 홈페이지 열기
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-bg-page text-text">
        <div className="mx-auto flex max-w-[720px] flex-col gap-12 px-6 pb-16 md:gap-16">
          <Hero />
          <EditableRegion label="공지" onEdit={edit("notice")}>
            {content.notice ? (
              <NoticeBand notice={content.notice} />
            ) : (
              <div className="flex min-h-16 items-center gap-2 rounded-lg border border-dashed border-border-strong px-4 text-body-sm text-text-muted">
                <Plus size={16} aria-hidden="true" />
                지금은 공지가 꺼져 있어요. 누르면 공지를 쓸 수 있어요.
              </div>
            )}
          </EditableRegion>
          <LeafDivider />
          <AboutSection content={content} />
          <DirectorSection />
          <ProgramSection />
          <EditableRegion label="반·시간표" onEdit={edit("classes")}>
            <ClassesSection content={content} />
          </EditableRegion>
          <EditableRegion label="수강료" onEdit={edit("tuition")}>
            <TuitionSection content={content} />
          </EditableRegion>
          <EditableRegion label="주소·전화번호" onEdit={edit("contact")}>
            <LocationSection content={content} />
          </EditableRegion>
          <EditableRegion label="전화번호" onEdit={edit("contact")}>
            <ConsultSection content={content} preview />
          </EditableRegion>
        </div>
        <EditableRegion label="학원 정보" onEdit={edit("footer")}>
          <SiteFooter content={content} />
        </EditableRegion>
      </div>

      <LandingEditModal section={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
