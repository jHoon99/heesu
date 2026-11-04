import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { RequireRole } from "@/core/auth";
import { PWA_THEME_COLOR } from "@/core/pwa";
import { StudentGate } from "@/features/auth";
import { StudentShell } from "@/features/student-shell";

export const metadata: Metadata = {
  robots: { index: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "희수영어", statusBarStyle: "default" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

// viewportFit cover makes env(safe-area-inset-bottom) non-zero on notched phones.
export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  viewportFit: "cover",
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="student">
      <StudentGate>
        <StudentShell>{children}</StudentShell>
      </StudentGate>
    </RequireRole>
  );
}
