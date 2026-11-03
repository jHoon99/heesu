"use client";

import { useEffect, useState } from "react";

/** 헤더 아래 띠에 걸린 섹션 id를 돌려줘요. */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // 문서 순서상 가장 앞에 걸린 섹션
        setActive(ids.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-130px 0px -55% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
