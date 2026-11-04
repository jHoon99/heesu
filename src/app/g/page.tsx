import type { Metadata } from "next";
import { GuardianScreen } from "@/features/guardian";

export const metadata: Metadata = {
  title: "학습 기록",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GuardianPage() {
  return <GuardianScreen />;
}
