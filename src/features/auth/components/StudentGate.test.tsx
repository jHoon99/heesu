import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyStudent } from "../data/student";
import { StudentGate } from "./StudentGate";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/core/auth", () => ({
  authKeys: { all: ["auth"] },
  useAuthSession: () => ({
    status: "signedIn",
    session: { user: { id: "u1" } },
  }),
  useSignOut: () => signOut,
}));
vi.mock("../data/student");
vi.mock("../screen/FirstLoginPasswordScreen", () => ({
  FirstLoginPasswordScreen: () => <div>비밀번호 변경</div>,
}));

const get = vi.mocked(getMyStudent);

let client: QueryClient;
function setup() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StudentGate>
        <div>홈</div>
      </StudentGate>
    </QueryClientProvider>,
  );
}

describe("StudentGate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows retry and sign-out on error, and retry refetches", async () => {
    get.mockRejectedValueOnce(new Error("x"));
    get.mockResolvedValueOnce({
      id: "s",
      name: "하늘",
      mustChangePassword: false,
    });
    setup();
    const user = userEvent.setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학생 정보를 불러오지 못했어요",
    );
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("홈")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("shows the offline message with retry and sign-out on a network error", async () => {
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    setup();
    const user = userEvent.setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "인터넷에 연결되지 않았어요. 연결을 확인하고 다시 시도해 주세요.",
    );
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("shows a contact message with sign-out when there is no student row", async () => {
    get.mockResolvedValue(null);
    setup();
    const user = userEvent.setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학생 정보를 찾을 수 없어요. 학원에 문의해 주세요.",
    );
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("forces the password screen when required", async () => {
    get.mockResolvedValue({ id: "s", name: "하늘", mustChangePassword: true });
    setup();
    expect(await screen.findByText("비밀번호 변경")).toBeInTheDocument();
  });

  it("keeps the content when a background refetch fails", async () => {
    get.mockResolvedValueOnce({
      id: "s",
      name: "하늘",
      mustChangePassword: false,
    });
    get.mockRejectedValueOnce(new Error("x"));
    setup();
    expect(await screen.findByText("홈")).toBeInTheDocument();
    await act(() => client.refetchQueries());
    await waitFor(() =>
      expect(
        client
          .getQueryCache()
          .getAll()
          .some((q) => q.state.status === "error"),
      ).toBe(true),
    );
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
