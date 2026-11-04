import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  addConsent,
  getStudentPrivate,
  listConsents,
  saveStudentPrivate,
  setStudentClasses,
} from "../data/detail";
import { resetStudentPassword } from "../data/functions";
import { getStudent } from "../data/students";
import { StudentFunctionError, type StudentSummary } from "../model/students";
import { StudentDetailScreen } from "./StudentDetailScreen";

let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock("../data/students");
vi.mock("../data/detail");
vi.mock("../data/functions");
vi.mock("@/features/guardian", () => ({
  GuardianLinkCard: ({ left }: { left: boolean }) => (
    <section>
      <h2>학부모 링크</h2>
      {left ? <p>퇴원한 학생은 학부모 링크를 만들 수 없어요.</p> : null}
    </section>
  ),
}));
vi.mock("@/features/payments", () => ({
  PaymentHistoryCard: () => (
    <section>
      <h2>결제 기록</h2>
    </section>
  ),
}));
let recordsResult: { isPending: boolean; isError: boolean; data?: unknown[] } =
  {
    isPending: false,
    isError: false,
    data: [],
  };
vi.mock("@/features/attendance", () => ({
  useStudentRecords: () => recordsResult,
}));
vi.mock("@/features/points", () => ({
  PointHistoryList: () => <p>포인트 내역 목록</p>,
}));
vi.mock("@/features/classes", () => ({
  classKeys: { all: ["classes"] },
  formatSchedule: () => "월 17:00–18:30",
  useClasses: () => ({
    isError: false,
    data: [
      { id: "c1", name: "중1 A반", schedule: [] },
      { id: "c2", name: "중2 B반", schedule: [] },
    ],
  }),
}));

const get = vi.mocked(getStudent);
const getPriv = vi.mocked(getStudentPrivate);
const savePriv = vi.mocked(saveStudentPrivate);
const setClasses = vi.mocked(setStudentClasses);
const list = vi.mocked(listConsents);
const add = vi.mocked(addConsent);
const reset = vi.mocked(resetStudentPassword);

const UUID = "6f1c2b3a-1111-4222-8333-444455556666";
const student: StudentSummary = {
  id: UUID,
  loginId: "haneul",
  name: "김하늘",
  grade: "중1",
  status: "active",
  joinedAt: "2026-11-05",
  school: null,
  classes: [{ id: "c1", name: "중1 A반" }],
};

let client: QueryClient;
function setup() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <StudentDetailScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

function expectNoPasswordCached(pw: string) {
  const cached = client
    .getMutationCache()
    .getAll()
    .filter((m) => JSON.stringify(m.state.variables ?? null).includes(pw));
  expect(cached).toHaveLength(0);
}

describe("StudentDetailScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search = new URLSearchParams(`id=${UUID}`);
    recordsResult = { isPending: false, isError: false, data: [] };
    get.mockResolvedValue(student);
    getPriv.mockResolvedValue(null);
    list.mockResolvedValue([]);
    setClasses.mockResolvedValue(undefined);
    savePriv.mockResolvedValue(undefined);
    add.mockResolvedValue(undefined);
    reset.mockResolvedValue(undefined);
  });

  it("shows the not-found card without an id", () => {
    search = new URLSearchParams("");
    setup();
    expect(
      screen.getByText("학생을 찾을 수 없어요. 목록에서 다시 골라 주세요."),
    ).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("renders header and cards", async () => {
    setup();
    expect(
      await screen.findByRole("heading", { name: "김하늘" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "정보 수정" })).toHaveAttribute(
      "href",
      `/admin/students/edit?id=${UUID}`,
    );
    for (const t of [
      "반 배정",
      "학교·보호자",
      "보호자 동의",
      "비밀번호 초기화",
      "학부모 링크",
      "결제 기록",
    ]) {
      expect(screen.getByRole("heading", { name: t })).toBeInTheDocument();
    }
  });

  it("hides link creation for a student who left", async () => {
    get.mockResolvedValue({ ...student, status: "left" });
    setup();
    expect(
      await screen.findByText("퇴원한 학생은 학부모 링크를 만들 수 없어요."),
    ).toBeInTheDocument();
  });

  it("shows recent records with status chips", async () => {
    recordsResult = {
      isPending: false,
      isError: false,
      data: [
        {
          sessionId: "a",
          date: "2026-11-04",
          className: "중등 기초반",
          att: "present",
          hw: "missing",
          submittedAt: "2026-11-04T06:30:00Z",
        },
        {
          sessionId: "b",
          date: "2026-10-28",
          className: "중등 기초반",
          att: "late",
          hw: "done",
          submittedAt: null,
        },
      ],
    };
    setup();
    await screen.findByRole("heading", { name: "최근 출결·숙제" });
    const row = screen.getByText("11/4").closest("tr") as HTMLElement;
    expect(within(row).getByText("중등 기초반")).toBeInTheDocument();
    expect(within(row).getByText("출석")).toBeInTheDocument();
    expect(within(row).getByText("미완료")).toBeInTheDocument();
    expect(within(row).getByText("제출 15:30")).toBeInTheDocument();
    expect(screen.getAllByText(/^제출 /)).toHaveLength(1);
    expect(row.closest("table")!.querySelectorAll("tr")).toHaveLength(3);
  });

  it("shows the empty text when there are no records", async () => {
    setup();
    expect(
      await screen.findByText("아직 수업 기록이 없어요."),
    ).toBeInTheDocument();
  });

  it("puts 포인트 내역 before the guardian card", async () => {
    setup();
    const points = await screen.findByRole("heading", { name: "포인트 내역" });
    const guardian = screen.getByRole("heading", { name: "학교·보호자" });
    expect(
      points.compareDocumentPosition(guardian) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("포인트 내역 목록")).toBeInTheDocument();
  });

  it("enables the class save only after a change and saves the diff", async () => {
    const user = setup();
    await screen.findByRole("heading", { name: "반 배정" });
    const save = screen.getAllByRole("button", { name: "저장" })[0]!;
    expect(save).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "중2 B반" }));
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(setClasses).toHaveBeenCalledTimes(1));
    expect(setClasses).toHaveBeenCalledWith(UUID, ["c1"], ["c1", "c2"]);
    expect(
      await screen.findByText("반 배정을 저장했어요."),
    ).toBeInTheDocument();
  });

  it("refetches after a failed class save and a retry applies the fresh diff", async () => {
    setClasses.mockRejectedValueOnce(new Error("network"));
    const user = setup();
    await screen.findByRole("heading", { name: "반 배정" });
    await user.click(screen.getByRole("checkbox", { name: "중2 B반" }));
    const calls = get.mock.calls.length;
    await user.click(screen.getAllByRole("button", { name: "저장" })[0]!);
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(calls));
    // the server now has c1 and c2 (insert had committed)
    get.mockResolvedValue({
      ...student,
      classes: [
        { id: "c1", name: "중1 A반" },
        { id: "c2", name: "중2 B반" },
      ],
    });
    await user.click(screen.getByRole("checkbox", { name: "중1 A반" }));
    await user.click(screen.getAllByRole("button", { name: "저장" })[0]!);
    await waitFor(() => expect(setClasses).toHaveBeenCalledTimes(2));
  });

  it("formats the guardian phone while typing and saves", async () => {
    const user = setup();
    const phone = await screen.findByLabelText("보호자 연락처");
    await user.type(phone, "01012345678");
    expect(phone).toHaveValue("010-1234-5678");
    const school = screen.getByLabelText("학교");
    await user.type(school, " 희수중 ");
    const card = phone.closest("form")!;
    await user.click(within(card).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(savePriv).toHaveBeenCalledTimes(1));
    expect(savePriv).toHaveBeenCalledWith(UUID, {
      school: "희수중",
      guardianName: null,
      guardianPhone: "010-1234-5678",
      memo: null,
    });
    expect(
      await screen.findByText("보호자 정보를 저장했어요."),
    ).toBeInTheDocument();
  });

  it("rejects a malformed guardian phone", async () => {
    const user = setup();
    const phone = await screen.findByLabelText("보호자 연락처");
    await user.type(phone, "0101");
    await user.click(
      within(phone.closest("form")!).getByRole("button", { name: "저장" }),
    );
    expect(
      await screen.findByText("010-0000-0000 형식으로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(savePriv).not.toHaveBeenCalled();
  });

  it("shows the not-applied message when the guardian save hits 0 rows", async () => {
    savePriv.mockRejectedValue(new SaveNotAppliedError());
    const user = setup();
    const school = await screen.findByLabelText("학교");
    await user.click(
      within(school.closest("form")!).getByRole("button", { name: "저장" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.",
    );
  });

  it("lists consents with the empty message and adds one with the default method", async () => {
    const user = setup();
    expect(
      await screen.findByText(/아직 동의 기록이 없어요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "서면" })).toBeChecked();
    expect(
      screen.queryByRole("button", { name: /삭제|수정$/ }),
    ).not.toBeInTheDocument();
    await user.type(screen.getAllByLabelText("보호자 이름")[1]!, "김엄마");
    await user.type(screen.getByLabelText("동의서 버전"), "2026-11");
    await user.click(screen.getByRole("button", { name: "기록 추가" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0]?.[1]).toMatchObject({
      guardianName: "김엄마",
      method: "written",
      version: "2026-11",
    });
    expect(
      await screen.findByText("동의 기록을 추가했어요."),
    ).toBeInTheDocument();
  });

  it("reminds to check the recording consent item before recording", async () => {
    setup();
    expect(
      await screen.findByText(
        "등록 동의서에 수업 녹화·영상 게시 동의 항목이 들어 있는지 확인한 뒤 기록해 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("rejects a future consent date", async () => {
    const user = setup();
    await screen.findByText(/아직 동의 기록이 없어요/);
    await user.type(screen.getAllByLabelText("보호자 이름")[1]!, "김엄마");
    await user.type(screen.getByLabelText("동의서 버전"), "2026-11");
    const at = screen.getByLabelText("동의 일시");
    await user.clear(at);
    await user.type(at, "2999-01-01T10:00");
    await user.click(screen.getByRole("button", { name: "기록 추가" }));
    expect(
      await screen.findByText("동의 일시는 지금보다 앞이어야 해요."),
    ).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });

  it("shows consent history newest first", async () => {
    list.mockResolvedValue([
      {
        id: "k1",
        guardianName: "김엄마",
        method: "phone",
        version: "2026-11",
        consentedAt: new Date(2026, 10, 5, 14, 30).toISOString(),
      },
    ]);
    setup();
    expect(await screen.findByText("2026.11.05 14:30")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "전화" })).toBeInTheDocument();
  });

  async function openReset(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole("button", { name: "비밀번호 초기화" }),
    );
    return screen.findByRole("dialog");
  }

  it("validates the new password and resets without caching it", async () => {
    const user = setup();
    const dialog = await openReset(user);
    const input = within(dialog).getByLabelText(/새 초기 비밀번호/);
    await user.type(input, "short12");
    await user.click(within(dialog).getByRole("button", { name: "초기화" }));
    expect(
      await within(dialog).findByText("비밀번호는 8자 이상으로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
    await user.type(input, "3");
    await user.click(within(dialog).getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    expect(reset).toHaveBeenCalledWith(UUID, "short123");
    expect(
      await screen.findByText(
        "비밀번호를 초기화했어요. 새 비밀번호를 학생에게 알려 주세요.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expectNoPasswordCached("short123"));
  });

  it("shows the server message in the modal and does not cache the password", async () => {
    reset.mockRejectedValue(
      new StudentFunctionError("student_left", "퇴원한 학생은 바꿀 수 없어요."),
    );
    const user = setup();
    const dialog = await openReset(user);
    await user.type(
      within(dialog).getByLabelText(/새 초기 비밀번호/),
      "password9",
    );
    await user.click(within(dialog).getByRole("button", { name: "초기화" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "퇴원한 학생은 바꿀 수 없어요.",
    );
    await waitFor(() => expectNoPasswordCached("password9"));
  });

  it("disables the reset button for a student who left", async () => {
    get.mockResolvedValue({ ...student, status: "left" });
    setup();
    expect(
      await screen.findByRole("button", { name: "비밀번호 초기화" }),
    ).toBeDisabled();
    expect(
      screen.getByText("퇴원한 학생은 초기화할 수 없어요."),
    ).toBeInTheDocument();
  });

  it("keeps the content when a background refetch fails", async () => {
    setup();
    expect(
      await screen.findByRole("heading", { name: "김하늘" }),
    ).toBeInTheDocument();
    get.mockRejectedValue(new Error("x"));
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
    expect(screen.getByRole("heading", { name: "김하늘" })).toBeInTheDocument();
    expect(screen.queryByText("불러오지 못했어요")).toBeNull();
  });
});
