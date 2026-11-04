"use client";

import { AboutSection } from "../components/AboutSection";
import { ConsultSection } from "../components/ConsultSection";
import { CtaBar } from "../components/CtaBar";
import { DirectorSection } from "../components/DirectorSection";
import { Hero } from "../components/Hero";
import { LeafDivider } from "../components/LeafDivider";
import { NoticeBand } from "../components/NoticeBand";
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
            <TuitionSection content={content} />
            <ConsultSection content={content} />
          </main>
          <CtaBar content={content} />
        </>
      )}
    </SiteChrome>
  );
}
