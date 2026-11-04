"use client";

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
import { SiteHeader } from "../components/SiteHeader";
import { TuitionSection } from "../components/TuitionSection";
import { SiteChrome } from "./SiteChrome";

export function LandingScreen() {
  return (
    <SiteChrome>
      {(content) => (
        <>
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
          <CtaBar content={content} />
        </>
      )}
    </SiteChrome>
  );
}
