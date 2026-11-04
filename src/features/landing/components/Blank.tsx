import type { ReactNode } from "react";
import { cn } from "@/design-system";

/** 아직 정해지지 않은 내용을 대신하는 점선 자리표시예요. */
export function Blank({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border border-dashed px-2",
        tone === "light"
          ? "border-gray-400 bg-bg-subtle font-medium text-text-muted"
          : "border-brown-400 text-brown-200",
      )}
    >
      {children}
    </span>
  );
}
