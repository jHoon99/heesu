import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { getSiteContent } from "@/features/site-content/data/getSiteContent";
import { saveSiteContent } from "@/features/site-content/data/saveSiteContent";
import { AdminLandingScreen } from "./AdminLandingScreen";

vi.mock("@/features/site-content/data/getSiteContent");
vi.mock("@/features/site-content/data/saveSiteContent");
vi.mock("@/features/consultations", () => ({
  ConsultForm: () => <div>진짜 상담 폼</div>,
}));
const get = vi.mocked(getSiteContent);
const save = vi.mocked(saveSiteContent);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AdminLandingScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  get.mockReset();
  save.mockReset();
  get.mockResolvedValue([
    {
      key: "tuition",
      value: { monthly: "월 30만원", textbook: null, note: null },
    },
  ]);
  save.mockResolvedValue();
});

describe("AdminLandingScreen", () => {
  it("draws the real landing with an edit button on each editable part", async () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "홈페이지 관리" }),
    ).toBeInTheDocument();
    for (const label of [
      "공지 고치기",
      "수강료 고치기",
      "주소·전화번호 고치기",
      "학원 정보 고치기",
    ])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    expect(await screen.findByText("월 30만원")).toBeInTheDocument();
  });

  it("offers to write a notice when the notice band is off", () => {
    setup();
    expect(screen.getByText(/지금은 공지가 꺼져 있어요/)).toBeInTheDocument();
  });

  it("never renders the real consult form", () => {
    setup();
    expect(screen.queryByText("진짜 상담 폼")).toBeNull();
    expect(
      screen.getByText(/실제 홈페이지에서는 이 자리에 상담 신청 폼이 있어요/),
    ).toBeInTheDocument();
  });

  it("opens the tuition editor in a modal, saves, and closes", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "수강료 고치기" }));
    const dialog = await screen.findByRole("dialog", { name: "수강료 고치기" });
    const monthly = await within(dialog).findByLabelText("월 수강료");
    expect(monthly).toHaveValue("월 30만원");
    await user.clear(monthly);
    await user.type(monthly, "월 32만원");
    await user.click(
      within(dialog).getByRole("button", { name: "수강료 저장" }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "tuition",
        expect.objectContaining({ monthly: "월 32만원" }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      await screen.findByText("홈페이지에 반영했어요."),
    ).toBeInTheDocument();
  });

  it("keeps the modal open and shows why when saving fails", async () => {
    save.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "공지 고치기" }));
    const dialog = await screen.findByRole("dialog", { name: "공지 고치기" });
    await user.type(await within(dialog).findByLabelText("제목"), "개강 안내");
    await user.type(within(dialog).getByLabelText("내용"), "12월에 열어요.");
    await user.click(within(dialog).getByRole("button", { name: "공지 저장" }));
    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows both the legal and contact forms for the footer", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "학원 정보 고치기" }));
    const dialog = await screen.findByRole("dialog", {
      name: "학원 정보 고치기",
    });
    expect(
      await within(dialog).findByLabelText("학원 명칭"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("전화번호")).toBeInTheDocument();
  });
});
