import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render as rtlRender,
  screen,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { LandingScreen } from "../index";
import { SECTIONS } from "../model/sections";

vi.mock("@/features/consultations", () => ({
  ConsultForm: () => <div>폼 자리</div>,
}));

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("LandingScreen", () => {
  it("renders the hero headline", () => {
    render(<LandingScreen />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "기본부터 깊이 있게, 실력으로 증명합니다.",
      }),
    ).toBeInTheDocument();
  });

  it("has a section nav whose links point at real sections", () => {
    const { container } = render(<LandingScreen />);
    const nav = screen.getByRole("navigation", { name: "섹션 바로가기" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(SECTIONS.length);
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
    expect(screen.getAllByText("블로그 글 제목")).toHaveLength(3);
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

  it("puts the #top target on the outermost wrapper, not main", () => {
    const { container } = render(<LandingScreen />);
    const top = container.querySelector("#top");
    expect(top).toBe(container.firstElementChild);
    expect(top?.tagName).not.toBe("MAIN");
  });

  it("lets the 상담 tab become active when the consult section is in view", () => {
    let callback: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    Element.prototype.scrollTo = vi.fn();
    const { container } = render(<LandingScreen />);
    const consult = container.querySelector("section#consult") as HTMLElement;
    act(() => {
      callback(
        [
          {
            isIntersecting: true,
            target: consult,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });
    const nav = screen.getByRole("navigation", { name: "섹션 바로가기" });
    expect(within(nav).getByRole("link", { name: "상담" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("drops the chip-row fade once the row is scrolled to its end", () => {
    render(<LandingScreen />);
    const nav = screen.getByRole("navigation", { name: "섹션 바로가기" });
    Object.defineProperty(nav, "scrollWidth", {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(nav, "clientWidth", {
      value: 375,
      configurable: true,
    });
    act(() => {
      nav.scrollLeft = 0;
      nav.dispatchEvent(new Event("scroll"));
    });
    expect(nav).toHaveAttribute("data-fade", "true");
    act(() => {
      nav.scrollLeft = 125;
      nav.dispatchEvent(new Event("scroll"));
    });
    expect(nav).not.toHaveAttribute("data-fade");
  });

  it("keeps the tapped tab active while the page scrolls past other sections", () => {
    vi.useFakeTimers();
    let callback: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    const { container } = render(<LandingScreen />);
    const nav = screen.getByRole("navigation", { name: "섹션 바로가기" });
    const tuition = within(nav).getByRole("link", { name: "수강료" });
    act(() => tuition.click());
    expect(tuition).toHaveAttribute("aria-current", "true");
    const callsAfterTap = scrollTo.mock.calls.length;

    // 내려가는 동안 '원장' 섹션을 지나가도 칩 줄은 그대로예요.
    const director = container.querySelector("section#director") as HTMLElement;
    act(() => {
      callback(
        [
          {
            isIntersecting: true,
            target: director,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(100);
    });
    expect(tuition).toHaveAttribute("aria-current", "true");
    expect(scrollTo.mock.calls.length).toBe(callsAfterTap);

    // 스크롤이 멈추면 다시 보이는 섹션을 따라가요.
    act(() => vi.advanceTimersByTime(200));
    expect(within(nav).getByRole("link", { name: "원장" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    vi.useRealTimers();
  });
});
