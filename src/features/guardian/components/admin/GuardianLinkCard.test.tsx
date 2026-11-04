import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { getGuardianLinkStatus, issueGuardianToken } from "../../data/guardian";
import { GuardianLinkCard } from "./GuardianLinkCard";

vi.mock("../../data/guardian");
const status = vi.mocked(getGuardianLinkStatus);
const issue = vi.mocked(issueGuardianToken);

const TOKEN = "A".repeat(10) + "b-_".repeat(11);
let client: QueryClient;
const writeText = vi.fn();
let rerenderCard: (left: boolean) => void = () => {};

function tree(left: boolean) {
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <GuardianLinkCard studentId="s1" left={left} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

function setup(left = false, prime?: () => void) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  prime?.();
  const view = render(tree(left));
  rerenderCard = (l: boolean) => view.rerender(tree(l));
  const user = userEvent.setup();
  // userEvent.setup()이 clipboard를 가짜로 바꾸므로 그 뒤에 덮는다.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  status.mockResolvedValue(null);
  issue.mockResolvedValue(TOKEN);
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("GuardianLinkCard", () => {
  it("issues a link when none exists and shows it", async () => {
    const user = setup();
    expect(
      await screen.findByText(
        "아직 만든 링크가 없어요. 링크를 만들어 학부모님께 카톡으로 보내 주세요.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "링크 만들기" }));
    const input = await screen.findByLabelText("학부모 링크");
    expect(input).toHaveValue(`${window.location.origin}/g#t=${TOKEN}`);
    expect(input).toHaveAttribute("readonly");
    expect(issue).toHaveBeenCalledWith("s1");
    expect(
      screen.getByText(
        "이 링크는 지금만 보여요. 화면을 떠나면 다시 볼 수 없으니, 잃어버리면 새 링크를 만들어 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("sends one request on a double click", async () => {
    let resolve: (t: string) => void = () => {};
    issue.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = setup();
    const btn = await screen.findByRole("button", { name: "링크 만들기" });
    await user.dblClick(btn);
    expect(issue).toHaveBeenCalledTimes(1);
    resolve(TOKEN);
    await screen.findByLabelText("학부모 링크");
  });

  it("copies the link and toasts", async () => {
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "링크 만들기" }),
    );
    await screen.findByLabelText("학부모 링크");
    await user.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/g#t=${TOKEN}`,
    );
    expect(
      await screen.findByText("링크를 복사했어요. 카톡으로 보내 주세요."),
    ).toBeInTheDocument();
  });

  it("toasts a fix when copying fails and keeps the link", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "링크 만들기" }),
    );
    await screen.findByLabelText("학부모 링크");
    await user.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(
      await screen.findByText(
        "복사하지 못했어요. 링크 칸을 눌러 직접 복사해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("학부모 링크")).toHaveValue(
      `${window.location.origin}/g#t=${TOKEN}`,
    );
  });

  it("formats dates in Seoul time whatever the browser zone", async () => {
    status.mockResolvedValue({
      createdAt: "2026-11-04T16:00:00Z",
      expiresAt: "2027-02-02T16:00:00Z",
    });
    setup();
    expect(
      await screen.findByText("2026.11.05 만듦 · 2027.02.03까지 열려요."),
    ).toBeInTheDocument();
  });

  it("does not offer issuing while a stale cached null is being refetched", async () => {
    status.mockReturnValue(new Promise(() => {}));
    setup(false, () => client.setQueryData(["guardian", "status", "s1"], null));
    await screen.findByRole("heading", { name: "학부모 링크" });
    expect(status).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "링크 만들기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "새 링크 만들기" })).toBeNull();
  });

  it("shows the error, not issuing, when a refetch over a cached null fails", async () => {
    status.mockRejectedValue({
      code: "P0001",
      message: "읽지 못했어요. 다시 시도해 주세요.",
    });
    setup(false, () => client.setQueryData(["guardian", "status", "s1"], null));
    expect(
      await screen.findByText("읽지 못했어요. 다시 시도해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "링크 만들기" })).toBeNull();
  });

  it("keeps the issued link visible after the invalidated status refetch settles", async () => {
    const user = setup();
    const create = await screen.findByRole("button", { name: "링크 만들기" });
    status.mockResolvedValue({
      createdAt: "2026-11-04T01:00:00Z",
      expiresAt: "2027-02-02T01:00:00Z",
    } as never);
    await user.click(create);
    await screen.findByLabelText("학부모 링크");
    await waitFor(() => expect(status).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("button", { name: "새 링크 만들기" }),
    ).toBeVisible();
    expect(screen.getByLabelText("학부모 링크")).toHaveValue(
      `${window.location.origin}/g#t=${TOKEN}`,
    );
  });

  it("does not resurrect an issued link after left then active", async () => {
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "링크 만들기" }),
    );
    await screen.findByLabelText("학부모 링크");
    rerenderCard(true);
    expect(screen.queryByLabelText("학부모 링크")).toBeNull();
    rerenderCard(false);
    await screen.findByRole("button", { name: "링크 만들기" });
    expect(screen.queryByLabelText("학부모 링크")).toBeNull();
  });

  it("does not read the status for a student who left", async () => {
    setup(true);
    await screen.findByText("퇴원한 학생은 학부모 링크를 만들 수 없어요.");
    expect(status).not.toHaveBeenCalled();
  });

  it("shows the error with a retry button", async () => {
    status.mockRejectedValueOnce({
      code: "P0001",
      message: "읽지 못했어요. 다시 시도해 주세요.",
    });
    const user = setup();
    expect(
      await screen.findByText("읽지 못했어요. 다시 시도해 주세요."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "링크 만들기" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("button", { name: "링크 만들기" }),
    ).toBeInTheDocument();
  });

  it("toasts a fix when the clipboard is unavailable and keeps the link", async () => {
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "링크 만들기" }),
    );
    await screen.findByLabelText("학부모 링크");
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    await user.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(
      await screen.findByText(
        "복사하지 못했어요. 링크 칸을 눌러 직접 복사해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("학부모 링크")).toBeInTheDocument();
  });

  describe("with an active link", () => {
    beforeEach(() => {
      status.mockResolvedValue({
        createdAt: "2026-11-04T03:00:00+09:00",
        expiresAt: "2027-02-02T03:00:00+09:00",
      });
    });

    it("shows dates and confirms before reissuing", async () => {
      const user = setup();
      expect(
        await screen.findByText("2026.11.04 만듦 · 2027.02.02까지 열려요."),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "새 링크 만들기" }));
      expect(
        screen.getByText(
          "새 링크를 만들면 지금 보낸 링크는 바로 열리지 않아요.",
        ),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(issue).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "새 링크 만들기" }));
      const dialog = screen.getByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: "새 링크 만들기" }),
      );
      await screen.findByLabelText("학부모 링크");
      expect(issue).toHaveBeenCalledTimes(1);
    });
  });

  it("hides the buttons for a student who left", async () => {
    setup(true);
    expect(
      await screen.findByText("퇴원한 학생은 학부모 링크를 만들 수 없어요."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the P0001 message verbatim", async () => {
    issue.mockRejectedValue({
      code: "P0001",
      message: "퇴원한 학생은 링크를 만들 수 없어요. 상태를 확인해 주세요.",
    });
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "링크 만들기" }),
    );
    expect(
      await screen.findByText(
        "퇴원한 학생은 링크를 만들 수 없어요. 상태를 확인해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("학부모 링크")).toBeNull();
  });

  it("leaves no raw token in the mutation cache", async () => {
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "링크 만들기" }),
    );
    await screen.findByLabelText("학부모 링크");
    await waitFor(() => {
      const dump = JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state),
      );
      expect(dump).not.toContain(TOKEN);
    });
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain(TOKEN);
  });
});
