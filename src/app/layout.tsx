import type { Metadata } from "next";
import { Gowun_Batang } from "next/font/google";
import "./fonts/pretendard/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SITE_URL } from "@/core/site";
import { Providers } from "./providers";

const gowun = Gowun_Batang({
  weight: ["400", "700"],
  variable: "--font-gowun",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "희수영어 | 전주 중·고등 영어", template: "%s | 희수영어" },
  description:
    "전주의 중·고등학생을 위한 영어 학원 희수영어예요. 2027년 1월에 문을 열고, 지금 상담 신청을 받고 있어요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "희수영어",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 1200,
        alt: "희수영어 HEESU ENGLISH",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${gowun.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
