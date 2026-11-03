import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { createStudent } from "../data/functions";
import { StudentFunctionError } from "../model/students";
import { StudentNewScreen } from "./StudentNewScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../data/functions");
const create = vi.mocked(createStudent);

let client: QueryClient;
function setup() {
  client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <StudentNewScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/아이디/), " Haneul ");
  await user.type(screen.getByLabelText(/초기 비밀번호/), "password1");
  await user.type(screen.getByLabelText(/이름/), "김하늘");
  await user.selectOptions(screen.getByLabelText(/학년/), "중1");
}

function expectNoPasswordCached() {
  const cached = client
    .getMutationCache()
    .getAll()
    .filter((m) =>
      JSON.stringify(m.state.variables ?? null).includes("password1"),
    );
  expect(cached).toHaveLength(0);
}

describe("StudentNewScreen", () => {
  beforeEach(() => {
    push.mockReset();
    create.mockReset();
  });

  it("shows validation messages on empty submit", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(
      await screen.findByText(
        "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이름을 1~20자로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByText("학년을 골라 주세요.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates once even when clicked twice while pending, then navigates", async () => {
    let resolve: (id: string) => void = () => {};
    create.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    const user = setup();
    await fill(user);
    const button = screen.getByRole("button", { name: "추가" });
    await user.click(button);
    await user.click(button);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      loginId: "haneul",
      password: "password1",
      name: "김하늘",
      grade: "중1",
    });
    resolve("s1");
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/students/detail?id=s1"),
    );
    await waitFor(() => expectNoPasswordCached());
    expect(
      await screen.findByText(
        "학생을 추가했어요. 아이디와 초기 비밀번호를 학생에게 알려 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("puts login_taken on the login id field", async () => {
    create.mockRejectedValue(
      new StudentFunctionError("login_taken", "이미 쓰고 있는 아이디예요."),
    );
    const user = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(
      await screen.findByText("이미 쓰고 있는 아이디예요."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expectNoPasswordCached());
  });

  it("shows an invalid server message as an alert", async () => {
    create.mockRejectedValue(
      new StudentFunctionError("invalid", "내용을 확인해 주세요."),
    );
    const user = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "내용을 확인해 주세요.",
    );
  });
});
