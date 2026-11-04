import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGuardianView } from "../data/guardian";
import type { GuardianView } from "../model/guardian";
import { useGuardianToken } from "../state/useGuardianToken";
import { GuardianScreen } from "./GuardianScreen";

vi.mock("../data/guardian");
vi.mock("../state/useGuardianToken");

const get = vi.mocked(getGuardianView);
const useToken = vi.mocked(useGuardianToken);
const forget = vi.fn();
const LINK_ERROR =
  "링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.";

const view = (over: Partial<GuardianView> = {}): GuardianView => ({
  name: "김하늘",
  today: "2026-11-04",
  totalPoints: 12,
  records: [
    {
      date: "2026-11-03",
      className: "중1 A",
      attendance: "present",
      homework: "done",
    },
  ],
  week: [],
  ...over,
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GuardianScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  forget.mockReset();
  useToken.mockReturnValue({ token: "tok", ready: true, forget });
});

describe("GuardianScreen", () => {
  it("shows the uniform error without a token", () => {
    useToken.mockReturnValue({ token: null, ready: true, forget });
    setup();
    expect(screen.getByRole("alert")).toHaveTextContent(LINK_ERROR);
    expect(get).not.toHaveBeenCalled();
  });

  it("is blank and busy before ready", () => {
    useToken.mockReturnValue({ token: null, ready: false, forget });
    const { container } = setup();
    expect(container.querySelector("[aria-busy]")).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("forgets the token and shows the uniform error on P0001", async () => {
    get.mockRejectedValue({ code: "P0001", message: "다른 문구" });
    setup();
    expect(await screen.findByText(LINK_ERROR)).toBeInTheDocument();
    expect(forget).toHaveBeenCalledTimes(1);
  });

  it("offers a retry on a network failure", async () => {
    get.mockRejectedValue(new TypeError("Failed to fetch"));
    setup();
    expect(
      await screen.findByText("네트워크 상태를 확인해 주세요."),
    ).toBeInTheDocument();
    get.mockResolvedValue(view());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(await screen.findByText("김하늘 학생의 학습 기록")).toBeVisible();
    expect(get).toHaveBeenLastCalledWith("tok");
  });

  it("shows the record", async () => {
    get.mockResolvedValue(view());
    setup();
    expect(await screen.findByText("김하늘 학생의 학습 기록")).toBeVisible();
    expect(screen.getByText("12점")).toBeVisible();
    expect(
      screen.getByText("이번 주에는 아직 수업 기록이 없어요."),
    ).toBeVisible();
    const chip = (name: string) =>
      screen.getByText(
        (_, el) => el?.tagName === "SPAN" && el.textContent === name,
      );
    expect(chip("출결 출석")).toBeInTheDocument();
    expect(chip("숙제 완료")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("tok");
  });

  it("wraps long summaries", async () => {
    get.mockResolvedValue(
      view({
        week: [
          {
            date: "2026-11-03",
            className: "중1 A",
            summary: "가".repeat(2000),
            homework: "p.1",
            homeworkDue: "2026-11-06",
          },
        ],
      }),
    );
    setup();
    await waitFor(() =>
      expect(screen.getByText("가".repeat(2000))).toHaveClass("break-words"),
    );
    expect(screen.getByText("마감 11/6(금)")).toBeVisible();
  });
});
