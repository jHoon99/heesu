"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/design-system";
import { SECTIONS } from "../model/sections";
import { useActiveSection } from "../state/useActiveSection";

const IDS = SECTIONS.map((s) => s.id);

export function SiteHeader() {
  const active = useActiveSection(IDS);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // 활성 탭이 바뀌면 탭 줄을 그 탭이 보이는 자리로 옮겨요.
  useEffect(() => {
    const nav = navRef.current;
    const tab = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !tab) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    nav.scrollTo({
      left: tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b bg-bg-page/90 backdrop-blur-md transition-[border-color,box-shadow] duration-(--dur-base) ease-out",
        scrolled ? "border-border shadow-sm" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-15 max-w-[960px] items-center justify-center px-4">
        <a
          href="#top"
          aria-label="희수영어 처음으로"
          className="flex items-center gap-2 text-text-brand no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음 */}
          <img src="/brand/heesu-mark.svg" alt="" width={36} height={33} />
          <span className="font-serif text-h2 text-[20px] leading-7">
            희수영어
          </span>
        </a>
      </div>
      <nav
        ref={navRef}
        aria-label="섹션 바로가기"
        className="mx-auto flex max-w-[960px] [scrollbar-width:none] gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] px-4 pb-2 md:justify-center md:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "true" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full px-3.5 text-label no-underline transition-colors duration-(--dur-fast) ease-out",
              active === id
                ? "bg-primary-soft text-text-brand"
                : "text-gray-700 hover:bg-bg-subtle hover:text-text",
            )}
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
