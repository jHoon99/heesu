import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { EMPTY_SITE_CONTENT, type SiteContent } from "@/features/site-content";
import { naverMapHref } from "../model/links";
import { AboutSection } from "./AboutSection";
import { ClassesSection } from "./ClassesSection";
import { ConsultSection } from "./ConsultSection";
import { CtaBar } from "./CtaBar";
import { LocationSection } from "./LocationSection";
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
      <ClassesSection content={content} />
      <TuitionSection content={content} />
      <LocationSection content={content} />
      <ConsultSection content={content} />
      <SiteFooter content={content} />
      <CtaBar content={content} />
    </ToastProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("filled content", () => {
  it("shows the classes without class placeholders", () => {
    renderAll(FILLED);
    expect(screen.getByText("기초반")).toBeInTheDocument();
    expect(screen.getByText("심화반")).toBeInTheDocument();
    expect(screen.getByText("월·수 17:00")).toBeInTheDocument();
    expect(screen.getByText("고1")).toBeInTheDocument();
    expect(screen.queryByText("반 이름")).toBeNull();
  });

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

  it("opens the map app in a new tab", () => {
    renderAll(FILLED);
    const link = screen.getByRole("link", { name: "지도 앱에서 보기" });
    expect(link).toHaveAttribute("href", naverMapHref(ADDRESS));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the consult form", () => {
    renderAll(FILLED);
    const consult = document.getElementById("consult") as HTMLElement;
    expect(within(consult).getByText("폼 자리")).toBeInTheDocument();
  });
});

describe("empty content", () => {
  it("shows three class placeholders and two price placeholders", () => {
    renderAll(EMPTY_SITE_CONTENT);
    expect(screen.getAllByText("반 이름")).toHaveLength(3);
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

  it("has no map link, a disabled copy button and no notice", () => {
    renderAll(EMPTY_SITE_CONTENT);
    expect(screen.queryByRole("link", { name: "지도 앱에서 보기" })).toBeNull();
    expect(screen.getByRole("button", { name: "주소 복사" })).toBeDisabled();
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
    const link = screen.getByRole("link", { name: "지도 앱에서 보기" });
    expect(link.getAttribute("href")).not.toContain("<");
    expect(link.getAttribute("href")).toContain("%3Cscript%3E");
    expect(container.querySelector("main script, script")).toBeNull();
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

describe("copy address", () => {
  function stubClipboard(writeText: () => Promise<void>) {
    const spy = vi.fn(writeText);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: spy },
      configurable: true,
    });
    return spy;
  }

  it("copies the address and toasts", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard(() => Promise.resolve());
    renderAll(FILLED);
    await user.click(screen.getByRole("button", { name: "주소 복사" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(ADDRESS);
    expect(await screen.findByText("주소를 복사했어요.")).toBeInTheDocument();
  });

  it("explains how to copy by hand when the clipboard rejects", async () => {
    const user = userEvent.setup();
    stubClipboard(() => Promise.reject(new Error("denied")));
    renderAll(FILLED);
    await user.click(screen.getByRole("button", { name: "주소 복사" }));
    expect(
      await screen.findByText(
        "복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.",
      ),
    ).toBeInTheDocument();
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

  it("wraps class, tuition, address and legal values", () => {
    const content: SiteContent = {
      ...FILLED,
      classes: [
        {
          name: LONG,
          grades: LONG + "1",
          schedule: LONG + "2",
          capacity: null,
        },
      ],
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
    expectWrapped(screen.getByRole("heading", { name: LONG }));
    expectWrapped(screen.getByText(LONG + "3"));
    expectWrapped(screen.getByText(LONG + "4"));
    const footer = within(screen.getByRole("contentinfo"));
    for (const t of ["6", "7", "8", "9", "0"])
      expectWrapped(footer.getByText(LONG + t));
    const loc = document.getElementById("location") as HTMLElement;
    expectWrapped(within(loc).getByText(LONG + "6"));
  });
});
