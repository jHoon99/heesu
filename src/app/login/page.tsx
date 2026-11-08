import type { Metadata, Viewport } from "next";
import { PWA_THEME_COLOR } from "@/core/pwa";
import { LoginScreen } from "@/features/auth";

// 학생은 로그인 전에 여기서 "앱으로 설치하기"를 눌러요. 설치 아이콘이 HS 마크가 되도록 앱 정보를 같이 걸어요.
export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "희수영어", statusBarStyle: "default" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
};

export default function Login() {
  return <LoginScreen />;
}
