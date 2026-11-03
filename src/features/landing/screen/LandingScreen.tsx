"use client";

import { useSiteContent } from "@/features/site-content";
import { AboutSection } from "../components/AboutSection";
import { ClassesSection } from "../components/ClassesSection";
import { ConsultSection } from "../components/ConsultSection";
import { CtaBar } from "../components/CtaBar";
import { DirectorSection } from "../components/DirectorSection";
import { Hero } from "../components/Hero";
import { LeafDivider } from "../components/LeafDivider";
import { LocationSection } from "../components/LocationSection";
import { NoticeBand } from "../components/NoticeBand";
import { ProgramSection } from "../components/ProgramSection";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TuitionSection } from "../components/TuitionSection";

export function LandingScreen() {
  // 읽는 동안에도 자리표시로 그려요 (스피너 없음).
  const { content } = useSiteContent();
  return (
    <div id="top" className="min-h-screen bg-bg-page text-text">
      <SiteHeader />
      <main className="mx-auto flex max-w-[720px] flex-col gap-12 px-4 pb-16 md:gap-16">
        <Hero />
        <NoticeBand notice={content.notice} />
        <LeafDivider />
        <AboutSection content={content} />
        <DirectorSection />
        <ProgramSection />
        <ClassesSection content={content} />
        <TuitionSection content={content} />
        <LocationSection content={content} />
        <ConsultSection content={content} />
      </main>
      <SiteFooter content={content} />
      <CtaBar content={content} />
    </div>
  );
}
