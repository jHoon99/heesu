import type { Metadata } from "next";
import { PrivacyScreen } from "@/features/landing";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default function Privacy() {
  return <PrivacyScreen />;
}
