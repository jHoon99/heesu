"use client";

import { AboutSection } from "../components/AboutSection";
import { ConsultSection } from "../components/ConsultSection";
import { CtaBar } from "../components/CtaBar";
import { DirectorSection } from "../components/DirectorSection";
import { GallerySection } from "../components/GallerySection";
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
          {/* 사진 띠만 화면 끝까지 쓰고, 나머지는 720px 폭 안에 둬요. */}
          <main className="flex flex-col gap-12 pb-16 md:gap-16">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-12 px-4 md:gap-16">
              <Hero />
              <NoticeBand notice={content.notice} />
              <LeafDivider />
              <AboutSection content={content} />
              <DirectorSection />
              <TuitionSection content={content} />
            </div>
            <GallerySection />
            <div className="mx-auto w-full max-w-[720px] px-4">
              <ConsultSection content={content} />
            </div>
          </main>
          <CtaBar content={content} />
        </>
      )}
    </SiteChrome>
  );
}
