import type { Metadata } from "next";
import { Gowun_Batang } from "next/font/google";
import "./fonts/pretendard/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Providers } from "./providers";

const gowun = Gowun_Batang({
  weight: ["400", "700"],
  variable: "--font-gowun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "희수영어",
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
