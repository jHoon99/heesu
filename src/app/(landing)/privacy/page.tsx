import type { Metadata } from "next";
import { PrivacyScreen } from "@/features/landing";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  // 법무 검토 전까지 색인하지 않는다 (v1-followups 참고).
  robots: { index: false, follow: true },
};

export default function Privacy() {
  return <PrivacyScreen />;
}
