import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { EMPTY_SITE_CONTENT, type SiteContent } from "@/features/site-content";
import { AboutSection } from "./AboutSection";
import { ConsultSection } from "./ConsultSection";
import { CtaBar } from "./CtaBar";
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
