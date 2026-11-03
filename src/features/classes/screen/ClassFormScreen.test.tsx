import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { createClass, getClass } from "../data/classes";
import { ClassFormScreen } from "./ClassFormScreen";

const push = vi.fn();
const router = { push };
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}));
vi.mock("../data/classes");

const get = vi.mocked(getClass);
const create = vi.mocked(createClass);
const UUID = "6f1c2b3a-1111-4222-8333-444455556666";
const NOT_FOUND = "반을 찾을 수 없어요. 목록에서 다시 골라 주세요.";

function setup(mode: "new" | "edit") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ClassFormScreen mode={mode} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("ClassFormScreen", () => {
  beforeEach(() => {
    push.mockReset();
    get.mockReset();
    create.mockReset();
    search = new URLSearchParams();
  });

  it.each([[""], ["id=abc"]])("shows the not-found card for %j", (qs) => {
    search = new URLSearchParams(qs);
    setup("edit");
    expect(screen.getByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "반 목록으로" })).toHaveAttribute(
      "href",
      "/admin/classes",
    );
    expect(get).not.toHaveBeenCalled();
  });

  it("shows the not-found card when the class does not exist", async () => {
    search = new URLSearchParams(`id=${UUID}`);
    get.mockResolvedValue(null);
    setup("edit");
    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(UUID);
  });

  it("creates a class, toasts and returns to the list", async () => {
    create.mockResolvedValue("new-id");
    const user = setup("new");
    await user.type(screen.getByLabelText(/반 이름/), "중등 A");
    await user.click(screen.getByRole("button", { name: "시간 추가" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/classes"));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      name: "중등 A",
      level: "middle",
      schedule: [{ day: 1, start: "17:00", end: "19:00" }],
      capacity: null,
    });
    expect(await screen.findByText("반을 저장했어요.")).toBeInTheDocument();
  });

  it("shows the duplicate-name message for 23505", async () => {
    create.mockRejectedValue({ code: "23505", message: "dup" });
    const user = setup("new");
    await user.type(screen.getByLabelText(/반 이름/), "중등 A");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText(
        "이미 같은 이름의 반이 있어요. 다른 이름을 입력해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the DB message for P0001 unchanged", async () => {
    create.mockRejectedValue({ code: "P0001", message: "시간표 문구예요." });
    const user = setup("new");
    await user.type(screen.getByLabelText(/반 이름/), "중등 A");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("시간표 문구예요.")).toBeInTheDocument();
  });

  it("blocks save with an end-before-start slot", async () => {
    const user = setup("new");
    await user.type(screen.getByLabelText(/반 이름/), "중등 A");
    await user.click(screen.getByRole("button", { name: "시간 추가" }));
    const end = screen.getByLabelText("1번째 끝나는 시각");
    await user.clear(end);
    await user.type(end, "16:00");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText("끝나는 시각을 시작보다 늦게 적어 주세요."),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });
});
