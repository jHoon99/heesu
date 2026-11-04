"use client";

import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants, cn } from "@/design-system";
import type { SiteContent } from "@/features/site-content";
import { telHref } from "../model/links";
import { shouldShowCtaBar } from "../model/sections";

export function CtaBar({ content }: { content: SiteContent }) {
  const href = telHref(content.contact.phone);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => {
      const consult = document.getElementById("consult");
      if (!consult) return;
      setShow(
        shouldShowCtaBar(
          window.scrollY,
          consult.getBoundingClientRect().top,
          window.innerHeight,
        ),
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-surface/95 shadow-sm backdrop-blur-md transition duration-(--dur-base) ease-out md:hidden",
        !show && "invisible translate-y-full opacity-0",
      )}
    >
      <div className="flex gap-2 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <a
          href={href ?? undefined}
          aria-disabled={href ? undefined : "true"}
          aria-label="전화로 문의하기"
          className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border-strong bg-bg-surface text-text hover:border-brown-300 hover:bg-bg-subtle"
        >
          <Phone size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
        <a
          href="#consult"
          className={cn(buttonVariants({ size: "lg" }), "flex-1")}
        >
          상담 신청하기
        </a>
      </div>
    </div>
  );
}
