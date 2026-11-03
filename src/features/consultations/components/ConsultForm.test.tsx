import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { submitConsultation } from "../data/submitConsultation";
import { SubmitConsultationError } from "../model/consultation";
import { ConsultForm } from "./ConsultForm";

vi.mock("./Turnstile", () => ({
  Turnstile: ({
    onToken,
    resetSignal,
  }: {
    onToken: (token: string | null) => void;
    resetSignal: number;
  }) => (
    <div data-testid="turnstile" data-reset={resetSignal}>
      <button type="button" onClick={() => onToken("tok")}>
        토큰 받기
      </button>
    </div>
  ),
}));
vi.mock("../data/submitConsultation");

const submit = vi.mocked(submitConsultation);
const CAPTCHA_MISSING = "자동 입력 방지 확인을 마쳐 주세요.";

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  }
  return {
    user: userEvent.setup(),
    ...render(<ConsultForm />, { wrapper: Wrapper }),
  };
}

type User = ReturnType<typeof userEvent.setup>;

async function fillAll(user: User) {
  await user.type(screen.getByLabelText(/학부모 성함/), "홍길동");
  await user.type(screen.getByLabelText(/연락처/), "01012345678");
  await user.selectOptions(screen.getByLabelText(/학생 학년/), "중2");
  await user.click(screen.getByLabelText(/보호자가 작성합니다/));
  await user.click(screen.getByLabelText(/개인정보 수집·이용 동의/));
}

const submitButton = () =>
  screen.getByRole("button", { name: "상담 신청하기" });

describe("ConsultForm", () => {
  beforeEach(() => {
    submit.mockReset();
  });

  it("shows all five required errors and does not submit an empty form", async () => {
    const { user } = renderForm();
    await user.click(submitButton());
    expect(
      await screen.findByText("학부모 성함을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("010-0000-0000 형식으로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByText("학생 학년을 골라 주세요.")).toBeInTheDocument();
    expect(
      screen.getByText("보호자만 신청할 수 있어요. 확인란을 체크해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("개인정보 수집·이용에 동의해 주세요."),
    ).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("formats the phone number while typing", async () => {
    const { user } = renderForm();
    const phone = screen.getByLabelText(/연락처/);
    await user.type(phone, "01012345678");
    expect(phone).toHaveValue("010-1234-5678");
  });

  it("submits the normalized payload once and shows the success card", async () => {
    submit.mockResolvedValue(undefined);
    const { user } = renderForm();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "토큰 받기" }));
    await user.click(submitButton());
    expect(
      await screen.findByText("신청이 접수됐어요. 원장이 직접 연락드릴게요."),
    ).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[0]).toEqual({
      parentName: "홍길동",
      phone: "010-1234-5678",
      grade: "중2",
      message: null,
      guardianConfirmed: true,
      privacyAgreed: true,
      consentVersion: "2026-11-05",
      turnstileToken: "tok",
    });
    expect(
      screen.queryByRole("button", { name: "상담 신청하기" }),
    ).not.toBeInTheDocument();
  });

  it("sends one request on a double click and disables the button", async () => {
    submit.mockReturnValue(new Promise(() => {}));
    const { user } = renderForm();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "토큰 받기" }));
    await user.dblClick(submitButton());
    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("asks for the captcha when there is no token", async () => {
    const { user } = renderForm();
    await fillAll(user);
    await user.click(submitButton());
    expect(await screen.findByText(CAPTCHA_MISSING)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("on a captcha failure toasts, keeps the form, resets the widget and requires a new token", async () => {
    submit.mockRejectedValue(new SubmitConsultationError("captcha"));
    const { user } = renderForm();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "토큰 받기" }));
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "자동 입력 방지 확인이 끝나지 않았어요. 확인 상자를 다시 눌러 주세요.",
    );
    expect(screen.getByLabelText(/학부모 성함/)).toHaveValue("홍길동");
    expect(screen.getByTestId("turnstile")).toHaveAttribute("data-reset", "1");
    await user.click(submitButton());
    expect(await screen.findByText(CAPTCHA_MISSING)).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("toasts the rate limit message", async () => {
    submit.mockRejectedValue(new SubmitConsultationError("rate_limited"));
    const { user } = renderForm();
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "토큰 받기" }));
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "오늘은 이 번호로 더 신청할 수 없어요. 전화로 문의해 주세요.",
    );
  });

  it("opens the privacy notice in a new tab", () => {
    renderForm();
    const link = screen.getByRole("link", { name: "내용 보기" });
    expect(link).toHaveAttribute("href", "/privacy#consult");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
