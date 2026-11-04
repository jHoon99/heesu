import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { listConsultations } from "../data/adminConsultations";
import type { ConsultationRecord } from "../model/adminConsultation";
import { AdminConsultationsScreen } from "./AdminConsultationsScreen";

vi.mock("../data/adminConsultations");
const list = vi.mocked(listConsultations);

function rec(over: Partial<ConsultationRecord>): ConsultationRecord {
  return {
    id: "c",
    parentName: "학부모",
    phone: "010-0000-0091",
    grade: "중1",
    message: null,
    status: "new",
    memo: null,
    createdAt: "2026-11-03T15:05:00Z",
    ...over,
  };
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AdminConsultationsScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("AdminConsultationsScreen", () => {
  it("lists new requests first with status text, tel link and Seoul time", async () => {
    list.mockResolvedValue([
      rec({ id: "a", parentName: "연락한분", status: "contacted" }),
      rec({ id: "b", parentName: "새분", status: "new" }),
    ]);
    setup();
    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]!).getByText("새분")).toBeVisible();
    expect(within(rows[1]!).getByText("새 신청")).toBeVisible();
    expect(within(rows[2]!).getByText("연락함")).toBeVisible();
    expect(
      within(rows[1]!).getByRole("link", { name: "010-0000-0091" }),
    ).toHaveAttribute("href", "tel:01000000091");
    expect(within(rows[1]!).getByText("2026.11.04 00:05")).toBeVisible();
    expect(
      screen.getByText(
        "등록하지 않은 신청은 신청일로부터 6개월이 지나면 자동으로 지워져요.",
      ),
    ).toBeVisible();
  });

  it("shows the empty text", async () => {
    list.mockResolvedValue([]);
    setup();
    expect(await screen.findByText(/아직 상담 신청이 없어요\./)).toBeVisible();
  });

  it("opens the edit modal for the row", async () => {
    list.mockResolvedValue([rec({ id: "a", parentName: "김부모" })]);
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "김부모 상담 보기" }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("메모")).toBeInTheDocument();
  });

  it("shows a full-page error only when there is no data", async () => {
    list.mockRejectedValue(new Error("boom"));
    setup();
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
