import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "../index";
import * as auth from "../data/auth";

const replace = vi.hoisted(() => vi.fn());
// next/navigation의 router는 렌더 사이에 같은 객체예요.
const router = vi.hoisted(() => ({ replace }));
const fetchMyRole = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../data/auth");
vi.mock("@/core/auth", () => ({
  fetchMyRole,
  homePathFor: (role: string) => (role === "admin" ? "/admin" : "/s"),
  authKeys: { all: ["auth"] },
}));

const api = vi.mocked(auth);
const NO_ACCOUNT = "로그인할 수 없는 계정이에요. 학원에 문의해 주세요.";
const ENROLL_GUIDE =
  "인증 앱(Google Authenticator 등)으로 QR 코드를 찍고, 앱에 보이는 6자리 숫자를 입력해 주세요.";
const VERIFY_GUIDE = "인증 앱에 보이는 6자리 숫자를 입력해 주세요.";
const QR = "data:image/svg+xml;utf-8,<svg></svg>";

function factor(id: string, status: "verified" | "unverified") {
  return {
    id,
    factor_type: "totp" as const,
    status,
    created_at: "",
    updated_at: "",
  };
}

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

async function signIn(id: string, password = "pw-1234") {
  const user = userEvent.setup();
  render(<LoginScreen />);
  await user.type(await screen.findByLabelText("아이디 또는 이메일"), id);
  await user.type(screen.getByLabelText("비밀번호"), password);
  await user.click(screen.getByRole("button", { name: "로그인" }));
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getAssurance.mockResolvedValue({ current: null, next: null });
  api.signInWithPassword.mockResolvedValue();
  api.listTotpFactors.mockResolvedValue([]);
  api.unenrollFactor.mockResolvedValue();
  api.enrollTotp.mockResolvedValue({
    factorId: "f1",
    qrCode: QR,
    secret: "SECRETBASE32",
  });
  api.verifyTotp.mockResolvedValue();
  api.signOut.mockResolvedValue();
});

describe("LoginScreen", () => {
  it("shows the credentials form when signed out", async () => {
    render(<LoginScreen />);
    expect(
      await screen.findByRole("heading", { name: "희수영어 로그인" }),
    ).toBeInTheDocument();
    const id = screen.getByLabelText("아이디 또는 이메일");
    expect(id).toHaveAttribute("autocomplete", "username");
    expect(id).toHaveAttribute("autocapitalize", "none");
    expect(id).toHaveAttribute("spellcheck", "false");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("rejects a malformed id without calling Auth", async () => {
    await signIn("ha-neul");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자예요. 다시 확인해 주세요.",
    );
    expect(api.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs a student in with the internal email and goes to /s", async () => {
    fetchMyRole.mockResolvedValue("student");
    await signIn("Haneul", "student-pass-1");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/s"));
    expect(api.signInWithPassword).toHaveBeenCalledWith(
      "haneul@student.heesu.internal",
      "student-pass-1",
    );
    expect(api.listTotpFactors).not.toHaveBeenCalled();
    expect(api.enrollTotp).not.toHaveBeenCalled();
  });

  it("signs out a student-path account that has no role", async () => {
    fetchMyRole.mockResolvedValue(null);
    await signIn("haneul");
    expect(await screen.findByRole("alert")).toHaveTextContent(NO_ACCOUNT);
    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("아이디 또는 이메일")).toBeInTheDocument();
  });

  it("shows the Auth error without revealing the account", async () => {
    api.signInWithPassword.mockRejectedValue({
      name: "AuthApiError",
      status: 400,
      code: "invalid_credentials",
    });
    await signIn("haneul");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "아이디 또는 비밀번호가 맞지 않아요. 다시 입력해 주세요.",
    );
  });

  it("enrolls TOTP for an admin without factors, then goes to /admin", async () => {
    fetchMyRole.mockResolvedValue("admin");
    const user = await signIn("Admin@Example.Test", "local-admin-pass-1234");
    const qr = await screen.findByAltText("인증 앱 등록용 QR 코드");
    expect(qr).toHaveAttribute("src", QR);
    expect(screen.getByText(ENROLL_GUIDE)).toBeInTheDocument();
    expect(screen.getByText("SECRETBASE32")).toBeInTheDocument();
    expect(api.signInWithPassword).toHaveBeenCalledWith(
      "admin@example.test",
      "local-admin-pass-1234",
    );
    expect(api.unenrollFactor).not.toHaveBeenCalled();

    const code = screen.getByLabelText("인증 코드");
    expect(code).toHaveAttribute("inputmode", "numeric");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAttribute("maxlength", "6");

    await user.type(code, "12345");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "6자리 숫자를 입력해 주세요.",
    );
    expect(api.verifyTotp).not.toHaveBeenCalled();

    await user.type(code, "6");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    expect(api.verifyTotp).toHaveBeenCalledWith("f1", "123456");
  });

  it("removes a leftover unverified factor before enrolling", async () => {
    api.listTotpFactors.mockResolvedValue([factor("u1", "unverified")]);
    await signIn("admin@example.test");
    await screen.findByAltText("인증 앱 등록용 QR 코드");
    expect(api.unenrollFactor).toHaveBeenCalledWith("u1");
    expect(api.unenrollFactor.mock.invocationCallOrder[0]).toBeLessThan(
      api.enrollTotp.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("verifies with an existing factor and keeps the step on a wrong code", async () => {
    api.listTotpFactors.mockResolvedValue([factor("v1", "verified")]);
    api.verifyTotp.mockRejectedValue({ code: "mfa_verification_failed" });
    const user = await signIn("admin@example.test");
    expect(await screen.findByText(VERIFY_GUIDE)).toBeInTheDocument();
    expect(api.enrollTotp).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("인증 코드"), "000000");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "인증 코드가 맞지 않아요. 앱에 보이는 6자리 숫자를 다시 입력해 주세요.",
    );
    expect(api.verifyTotp).toHaveBeenCalledWith("v1", "000000");
    expect(screen.getByText(VERIFY_GUIDE)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs out a student who came in through the email path", async () => {
    api.listTotpFactors.mockResolvedValue([factor("v1", "verified")]);
    fetchMyRole.mockResolvedValue("student");
    const user = await signIn("someone@example.test");
    await user.type(await screen.findByLabelText("인증 코드"), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(NO_ACCOUNT);
    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("아이디 또는 이메일")).toBeInTheDocument();
  });

  it("never offers TOTP enrollment for a student-domain email", async () => {
    fetchMyRole.mockResolvedValue("student");
    await signIn("haneul@student.heesu.internal");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/s"));
    expect(api.listTotpFactors).not.toHaveBeenCalled();
    expect(api.enrollTotp).not.toHaveBeenCalled();
  });

  it("goes straight to code entry when the session needs aal2", async () => {
    api.getAssurance.mockResolvedValue({ current: "aal1", next: "aal2" });
    api.listTotpFactors.mockResolvedValue([factor("v1", "verified")]);
    render(<LoginScreen />);
    expect(await screen.findByText(VERIFY_GUIDE)).toBeInTheDocument();
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
  });

  it("redirects a signed-in admin at aal2 without showing the form", async () => {
    api.getAssurance.mockResolvedValue({ current: "aal2", next: "aal2" });
    fetchMyRole.mockResolvedValue("admin");
    render(<LoginScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
    expect(api.signOut).not.toHaveBeenCalled();
  });

  it("signs out a leftover session without a role on mount", async () => {
    api.getAssurance.mockResolvedValue({ current: "aal1", next: "aal1" });
    fetchMyRole.mockResolvedValue(null);
    render(<LoginScreen />);
    expect(await screen.findByLabelText("비밀번호")).toBeInTheDocument();
    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("calls Auth once when 로그인 is clicked twice while pending", async () => {
    api.signInWithPassword.mockReturnValue(new Promise(() => {}));
    const user = await signIn("haneul");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(api.signInWithPassword).toHaveBeenCalledTimes(1);
  });
});
