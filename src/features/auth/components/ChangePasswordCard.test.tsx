import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { updateMyPassword } from "../data/student";
import { ChangePasswordCard } from "./ChangePasswordCard";

vi.mock("../data/student");

const update = vi.mocked(updateMyPassword);
let client: QueryClient;

function setup() {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ChangePasswordCard />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  a: string,
  b = a,
) {
  await user.type(screen.getByLabelText("새 비밀번호"), a);
  await user.type(screen.getByLabelText("새 비밀번호 확인"), b);
  await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" }));
}

function cachedVariables() {
  return client
    .getMutationCache()
    .getAll()
    .map((m) => m.state.variables);
}

describe("ChangePasswordCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    update.mockResolvedValue();
  });

  it("rejects mismatched passwords without calling the server", async () => {
    const user = setup();
    await fill(user, "new-pass-123", "other-pass-1");
    expect(
      await screen.findByText(
        "두 비밀번호가 달라요. 같은 비밀번호를 한 번 더 입력해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a 7 character password", async () => {
    const user = setup();
    await fill(user, "abcdefg");
    expect(
      await screen.findByText("비밀번호는 8자 이상으로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("changes the password, toasts, clears the form and keeps no password in the cache", async () => {
    const user = setup();
    await fill(user, "new-pass-123");
    expect(await screen.findByText("비밀번호를 바꿨어요.")).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("new-pass-123");
    expect(screen.getByLabelText("새 비밀번호")).toHaveValue("");
    expect(screen.getByLabelText("새 비밀번호 확인")).toHaveValue("");
    await waitFor(() =>
      expect(cachedVariables()).not.toContain("new-pass-123"),
    );
  });

  it("shows a fix-it message for same_password and keeps no password in the cache", async () => {
    update.mockRejectedValue({ code: "same_password" });
    const user = setup();
    await fill(user, "new-pass-123");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "지금 비밀번호와 다른 비밀번호를 입력해 주세요.",
    );
    await waitFor(() =>
      expect(cachedVariables()).not.toContain("new-pass-123"),
    );
  });

  it("ignores a second submit while pending", async () => {
    let resolve!: () => void;
    update.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const user = setup();
    await fill(user, "new-pass-123");
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText("새 비밀번호"), "{Enter}");
    resolve();
    await screen.findByText("비밀번호를 바꿨어요.");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
