import { AboutSection } from "../components/AboutSection";
import { ClassesSection } from "../components/ClassesSection";
import { ConsultSection } from "../components/ConsultSection";
import { CtaBar } from "../components/CtaBar";
import { DirectorSection } from "../components/DirectorSection";
import { Hero } from "../components/Hero";
import { LeafDivider } from "../components/LeafDivider";
import { LocationSection } from "../components/LocationSection";
import { ProgramSection } from "../components/ProgramSection";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TuitionSection } from "../components/TuitionSection";

export function LandingScreen() {
  return (
    <div id="top" className="min-h-screen bg-bg-page text-text">
      <SiteHeader />
      <main className="mx-auto flex max-w-[720px] flex-col gap-12 px-4 pb-16 md:gap-16">
        <Hero />
        <LeafDivider />
        <AboutSection />
        <DirectorSection />
        <ProgramSection />
        <ClassesSection />
        <TuitionSection />
        <LocationSection />
        <ConsultSection />
      </main>
      <SiteFooter />
      <CtaBar />
    </div>
  );
}
