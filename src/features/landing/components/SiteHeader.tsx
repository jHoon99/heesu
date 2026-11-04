"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/design-system";
import { SECTIONS } from "../model/sections";
import { useActiveSection } from "../state/useActiveSection";

const IDS = SECTIONS.map((s) => s.id);

export function SiteHeader() {
  const observed = useActiveSection(IDS);
  // 칩을 누르면 페이지가 내려가는 동안 지나가는 섹션 때문에 칩 줄이 흔들리지 않게,
  // 스크롤이 멈출 때까지 누른 칩을 고정해요.
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? observed;
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  // 칩 줄을 끝까지 밀면 오른쪽 흐림을 걷어서 마지막 칩('상담')이 또렷하게 보여요.
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () =>
      setAtEnd(nav.scrollLeft >= nav.scrollWidth - nav.clientWidth - 1);
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (pinned === null) return;
    let timer = window.setTimeout(() => setPinned(null), 150);
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPinned(null), 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pinned]);

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
    const max = nav.scrollWidth - nav.clientWidth;
    const left = Math.min(
      max,
      Math.max(0, tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2),
    );
    if (Math.abs(nav.scrollLeft - left) < 1) return;
    nav.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
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
          className="flex min-h-11 items-center gap-2 text-text-brand no-underline"
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
        data-fade={atEnd ? undefined : "true"}
        className={cn(
          "relative mx-auto flex max-w-[960px] [scrollbar-width:none] gap-1 overflow-x-auto px-4 pb-2 md:justify-center md:[mask-image:none] [&::-webkit-scrollbar]:hidden",
          !atEnd &&
            "[mask-image:linear-gradient(to_right,black_85%,transparent)]",
        )}
      >
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "true" : undefined}
            onClick={() => setPinned(id)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center rounded-full px-3.5 text-label no-underline transition-colors duration-(--dur-fast) ease-out",
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
