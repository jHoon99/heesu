import type { Metadata } from "next";
import { LoginScreen } from "@/features/auth";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false },
};

export default function Login() {
  return <LoginScreen />;
}
