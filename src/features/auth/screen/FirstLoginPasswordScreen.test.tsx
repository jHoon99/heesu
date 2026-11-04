import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { markPasswordChanged, updateMyPassword } from "../data/student";
import { FirstLoginPasswordScreen } from "./FirstLoginPasswordScreen";

vi.mock("../data/student");

const update = vi.mocked(updateMyPassword);
const mark = vi.mocked(markPasswordChanged);

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <FirstLoginPasswordScreen />
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

describe("FirstLoginPasswordScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    update.mockResolvedValue();
    mark.mockResolvedValue();
  });

  it("shows the fixed title and body", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "새 비밀번호를 정해 주세요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "원장님이 알려 준 비밀번호는 처음 한 번만 써요. 나만 아는 비밀번호로 바꿔 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("rejects a short password without calling the API", async () => {
    const user = setup();
    await fill(user, "short");
    expect(
      await screen.findByText("비밀번호는 8자 이상으로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation", async () => {
    const user = setup();
    await fill(user, "abcd1234", "abcd12345");
    expect(
      await screen.findByText(
        "두 비밀번호가 달라요. 같은 비밀번호를 한 번 더 입력해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("changes the password and shows a success toast", async () => {
    const user = setup();
    await fill(user, "abcd1234");
    expect(await screen.findByText("비밀번호를 바꿨어요.")).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith("abcd1234");
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it("shows same_password as an alert", async () => {
    update.mockRejectedValueOnce({ code: "same_password" });
    const user = setup();
    await fill(user, "abcd1234");
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "지금 비밀번호와 다른 비밀번호를 입력해 주세요.",
      ),
    );
  });
});
