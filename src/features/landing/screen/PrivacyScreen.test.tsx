import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { PrivacyScreen } from "../index";

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("PrivacyScreen", () => {
  it("has the h1", () => {
    render(<PrivacyScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "개인정보처리방침" }),
    ).toBeInTheDocument();
  });

  it("has a consult section anchor with the collected items and retention", () => {
    render(<PrivacyScreen />);
    const consult = document.getElementById("consult");
    expect(consult).not.toBeNull();
    const inner = within(consult as HTMLElement);
    for (const t of ["학부모 성함", "연락처", "학생 학년", "6개월"]) {
      expect(inner.getAllByText(new RegExp(t)).length).toBeGreaterThan(0);
    }
  });

  it("names processors and the under-14 rule", () => {
    const { container } = render(<PrivacyScreen />);
    const text = container.textContent ?? "";
    for (const t of [
      "Supabase",
      "Cloudflare",
      "Sentry",
      "솔라피",
      "14세 미만",
      "법정대리인",
    ]) {
      expect(text).toContain(t);
    }
  });

  it("never shows draft wording on screen", () => {
    const { container } = render(<PrivacyScreen />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("초안");
    expect(text).not.toContain("법률 검토");
  });
});
