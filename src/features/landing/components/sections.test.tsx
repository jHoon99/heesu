import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { EMPTY_SITE_CONTENT, type SiteContent } from "@/features/site-content";
import { AboutSection, storyNumber } from "./AboutSection";
import { ConsultSection } from "./ConsultSection";
import { CtaBar } from "./CtaBar";
import { DirectorSection } from "./DirectorSection";
import { NoticeBand } from "./NoticeBand";
import { SiteFooter } from "./SiteFooter";
import { TuitionSection } from "./TuitionSection";

vi.mock("@/features/consultations", () => ({
  ConsultForm: () => <div>폼 자리</div>,
}));

const ADDRESS = "전북 전주시 완산구 1";

const FILLED: SiteContent = {
  pointsGoal: 30,
  notice: null,
  classes: [
    { name: "기초반", grades: "중1", schedule: "월·수 17:00", capacity: 8 },
    { name: "심화반", grades: "고1", schedule: "화·목 19:00", capacity: null },
  ],
  tuition: { monthly: "월 30만원", textbook: "교재 3만원", note: "분기 납부" },
  contact: { phone: "063-000-0000", address: ADDRESS },
  legal: {
    academyName: "희수영어학원",
    registrationNo: "제 1234호",
    subjects: "외국어(영어)",
    tuitionNotice: "교육청 게시",
  },
  about: { intro: null, items: [] },
};

function renderAll(content: SiteContent) {
  return render(
    <ToastProvider>
      <NoticeBand notice={content.notice} />
      <AboutSection content={content} />
      <TuitionSection content={content} />
      <ConsultSection content={content} />
      <SiteFooter content={content} />
      <CtaBar content={content} />
    </ToastProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("filled content", () => {
  it("shows tuition values", () => {
    renderAll(FILLED);
    expect(screen.getByText("월 30만원")).toBeInTheDocument();
    expect(screen.getByText("교재 3만원")).toBeInTheDocument();
    expect(screen.queryByText("금액")).toBeNull();
    expect(screen.getByText(/분기 납부/)).toBeInTheDocument();
  });

  it("fills the footer legal fields, address and phone", () => {
    renderAll(FILLED);
    const footer = screen.getByRole("contentinfo");
    for (const text of [
      "희수영어학원",
      "제 1234호",
      "외국어(영어)",
      "교육청 게시",
      ADDRESS,
      "063-000-0000",
    ]) {
      expect(within(footer).getByText(text)).toBeInTheDocument();
    }
  });

  it("links the phone buttons with tel:", () => {
    renderAll(FILLED);
    const links = screen.getAllByRole("link", {
      name: /전화로 문의하기/,
      hidden: true,
    });
    expect(links).toHaveLength(2);
    for (const link of links)
      expect(link).toHaveAttribute("href", "tel:0630000000");
  });

  it("renders the consult form", () => {
    renderAll(FILLED);
    const consult = document.getElementById("consult") as HTMLElement;
    expect(within(consult).getByText("폼 자리")).toBeInTheDocument();
  });
});

describe("empty content", () => {
  it("shows two price placeholders", () => {
    renderAll(EMPTY_SITE_CONTENT);
    expect(screen.getAllByText("금액")).toHaveLength(2);
  });

  it("renders phone buttons without href but disabled", () => {
    renderAll(EMPTY_SITE_CONTENT);
    const consult = document.getElementById("consult") as HTMLElement;
    const call = within(consult).getByText("전화로 문의하기").closest("a");
    expect(call).not.toHaveAttribute("href");
    expect(call).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.queryAllByRole("link", { name: /전화로 문의하기/, hidden: true }),
    ).toHaveLength(0);
    expect(screen.getByLabelText("전화로 문의하기")).not.toHaveAttribute(
      "href",
    );
  });

  it("has no notice", () => {
    renderAll(EMPTY_SITE_CONTENT);
    expect(screen.queryByText("설명회 안내")).toBeNull();
  });
});

describe("unsafe free text", () => {
  it("renders no href for a javascript: phone", () => {
    renderAll({
      ...EMPTY_SITE_CONTENT,
      contact: { phone: "javascript:alert(1)", address: null },
    });
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
    expect(document.querySelector('a[href^="tel"]')).toBeNull();
  });

  it("encodes markup in the address and shows it as text", () => {
    const address = "<script>alert(1)</script>";
    const { container } = renderAll({
      ...EMPTY_SITE_CONTENT,
      contact: { phone: null, address },
    });
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByText(address)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("notice band", () => {
  it("shows title and body as plain text", () => {
    render(
      <NoticeBand notice={{ title: "설명회 안내", body: "12월 7일 토요일" }} />,
    );
    expect(screen.getByText("설명회 안내")).toBeInTheDocument();
    expect(screen.getByText("12월 7일 토요일")).toBeInTheDocument();
  });

  it("does not interpret HTML in the body", () => {
    const { container } = render(
      <NoticeBand notice={{ title: "t", body: "<b>굵게</b>" }} />,
    );
    expect(screen.getByText("<b>굵게</b>")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
  });

  it("renders nothing without a notice", () => {
    const { container } = render(<NoticeBand notice={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("long unbroken text", () => {
  const LONG = "가".repeat(300);

  function expectWrapped(el: HTMLElement) {
    expect(el.className).toContain("break-words");
    expect(el.parentElement?.className).toContain("min-w-0");
  }

  it("wraps the notice title", () => {
    render(<NoticeBand notice={{ title: LONG, body: LONG + "a" }} />);
    expectWrapped(screen.getByText(LONG));
    expectWrapped(screen.getByText(LONG + "a"));
  });

  it("wraps tuition, address and legal values", () => {
    const content: SiteContent = {
      ...FILLED,
      tuition: { monthly: LONG + "3", textbook: LONG + "4", note: LONG + "5" },
      contact: { phone: null, address: LONG + "6" },
      legal: {
        academyName: LONG + "7",
        registrationNo: LONG + "8",
        subjects: LONG + "9",
        tuitionNotice: LONG + "0",
      },
    };
    renderAll(content);
    expectWrapped(screen.getByText(LONG + "3"));
    expectWrapped(screen.getByText(LONG + "4"));
    const footer = within(screen.getByRole("contentinfo"));
    for (const t of ["6", "7", "8", "9", "0"])
      expectWrapped(footer.getByText(LONG + t));
  });
});

describe("about section", () => {
  const about = (a: SiteContent["about"]) => {
    renderAll({ ...EMPTY_SITE_CONTENT, about: a });
    return document.getElementById("about") as HTMLElement;
  };
  const stories = (section: HTMLElement) =>
    within(section).getByRole("list", { name: "희수영어 이야기" });

  it("shows three numbered placeholder cards and no intro when empty", () => {
    const section = about({ intro: null, items: [] });
    expect(within(section).queryByText("학원 소개 글 2~3문장")).toBeNull();
    const cards = within(stories(section)).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    expect(within(section).getAllByText("블로그 글 제목")).toHaveLength(3);
    expect(within(section).getAllByText("짧은 소개 2~3줄")).toHaveLength(3);
    expect(
      within(cards[2] as HTMLElement).getByText("INTRO 03"),
    ).toBeInTheDocument();
    expect(within(section).queryAllByRole("link")).toHaveLength(0);
  });

  it("shows the uploaded photo when a card has one", () => {
    const section = about({
      intro: null,
      items: [
        {
          title: "희수영어 소개",
          url: "https://blog.naver.com/heesu",
          teaser: null,
          image: "about/11111111-1111-4111-8111-111111111111.jpg",
        },
        {
          title: "수업 이야기",
          url: "https://blog.naver.com/heesu",
          teaser: null,
          image: null,
        },
      ],
    });
    const srcs = within(section)
      .getAllByRole("link")
      .map((a) => a.querySelector("img")?.getAttribute("src"));
    expect(srcs).toEqual([
      "http://127.0.0.1:56321/storage/v1/object/public/site-images/about/11111111-1111-4111-8111-111111111111.jpg",
      "/about/sample-2.svg",
    ]);
  });

  it("makes each story card one safe link with the number, title, teaser and image", () => {
    const section = about({
      intro: "첫 줄\n둘째 줄",
      items: [
        {
          title: "희수영어 소개",
          url: "https://blog.naver.com/heesu/1",
          teaser: "영어를 잘 가르친다는 것은 무엇일까요?\n기준을 이야기합니다.",
          image: null,
        },
        {
          title: "수업 이야기",
          url: "https://blog.naver.com/heesu/2",
          teaser: null,
          image: null,
        },
        {
          title: "숙제 이야기",
          url: "https://blog.naver.com/heesu/3",
          teaser: null,
          image: null,
        },
        {
          title: "넷째 이야기",
          url: "https://blog.naver.com/heesu/4",
          teaser: null,
          image: null,
        },
      ],
    });
    const intro = within(section).getByText(/첫 줄/);
    expect(intro.textContent).toBe("첫 줄\n둘째 줄");
    expect(intro).toHaveClass("whitespace-pre-line");
    expect(within(section).queryByText("블로그 글 제목")).toBeNull();

    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://blog.naver.com/heesu/1",
      "https://blog.naver.com/heesu/2",
      "https://blog.naver.com/heesu/3",
      "https://blog.naver.com/heesu/4",
    ]);
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
      expect(within(a).getByText("이야기 읽어보기")).toBeInTheDocument();
    }
    const first = links[0] as HTMLElement;
    expect(within(first).getByRole("heading").textContent).toBe(
      "INTRO 01 | 희수영어 소개",
    );
    const teaser = within(first).getByText(/무엇일까요/);
    expect(teaser.textContent).toBe(
      "영어를 잘 가르친다는 것은 무엇일까요?\n기준을 이야기합니다.",
    );
    expect(teaser).toHaveClass("whitespace-pre-line");
    // 예시 사진은 세 장을 돌아가며 써요.
    const srcs = links.map((a) => a.querySelector("img")?.getAttribute("src"));
    expect(srcs).toEqual([
      "/about/sample-1.svg",
      "/about/sample-2.svg",
      "/about/sample-3.svg",
      "/about/sample-1.svg",
    ]);
    // 이야기 카드는 소개 글 뒤, 대상·운영 시간 정보 앞에 와요.
    const order = Array.from(section.querySelectorAll("p, ul, a, span")).map(
      (el) => el.textContent ?? "",
    );
    const at = (t: string) => order.findIndex((x) => x.startsWith(t));
    expect(at("첫 줄")).toBeLessThan(at("INTRO 01"));
    expect(at("INTRO 01")).toBeLessThan(at("대상"));
  });

  it("numbers cards with two digits", () => {
    expect(storyNumber(0)).toBe("INTRO 01");
    expect(storyNumber(9)).toBe("INTRO 10");
  });
});

describe("director and consult guide", () => {
  it("shows the director's education, focus and class style", () => {
    render(<DirectorSection />);
    const section = document.getElementById("director") as HTMLElement;
    for (const label of ["EDUCATION", "TEACHING FOCUS", "CLASS STYLE"])
      expect(
        within(section).getByRole("heading", { name: label }),
      ).toBeInTheDocument();
    expect(within(section).getByText("영어영문학과 졸업")).toBeInTheDocument();
    expect(within(section).getAllByRole("listitem")).toHaveLength(6);
  });

  it("explains the consult promise, three steps and the note before the form", () => {
    renderAll(EMPTY_SITE_CONTENT);
    const section = document.getElementById("consult") as HTMLElement;
    expect(
      within(section).getByRole("heading", {
        name: /희수영어는\s*꼼꼼하고 진심 있는 상담을\s*약속드립니다\./,
      }),
    ).toBeInTheDocument();
    const steps = within(section).getAllByRole("listitem");
    expect(steps.map((li) => li.querySelector("h3")?.textContent)).toEqual([
      "레벨테스트 후 상담 진행합니다.",
      "방문 상담은 사전 예약제로 가능합니다.",
      "정확한 상담을 위한 사전 준비가 필요합니다.",
    ]);
    expect(
      within(section).getByRole("complementary", { name: "안내 말씀" }),
    ).toHaveTextContent("등록이 제한될 수 있습니다");
  });
});
