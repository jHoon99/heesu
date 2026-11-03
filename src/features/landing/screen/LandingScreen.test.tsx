import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingScreen } from "../index";
import { SECTIONS } from "../model/sections";

describe("LandingScreen", () => {
  it("renders the hero headline", () => {
    render(<LandingScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "한 문장씩, 깊이 있게." }),
    ).toBeInTheDocument();
  });

  it("has a section nav whose links point at real sections", () => {
    const { container } = render(<LandingScreen />);
    const nav = screen.getByRole("navigation", { name: "섹션 바로가기" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(7);
    links.forEach((link, i) => {
      const id = SECTIONS[i]?.id;
      expect(link).toHaveAttribute("href", `#${id}`);
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
    });
  });

  it("links the hero button to the consult section", () => {
    render(<LandingScreen />);
    const links = screen.getAllByRole("link", { name: /상담 신청하기/ });
    expect(links[0]).toHaveAttribute("href", "#consult");
  });

  it("shows placeholders for content not decided yet", () => {
    const { container } = render(<LandingScreen />);
    expect(screen.getByText("학원 소개 글 2~3문장")).toBeInTheDocument();
    const director = container.querySelector("section#director") as HTMLElement;
    expect(within(director).getByText("원장 이름")).toBeInTheDocument();
  });

  it("has a footer with privacy link and copyright", () => {
    render(<LandingScreen />);
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "개인정보처리방침" }),
    ).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByText("© 2027 희수영어")).toBeInTheDocument();
  });
});
