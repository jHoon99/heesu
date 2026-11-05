import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStudentClinic } from "../data/clinic";
import type { ClinicItem } from "../model/clinic";
import { MyClinicList } from "./MyClinicList";

vi.mock("../data/clinic");
const list = vi.mocked(listStudentClinic);

const base: ClinicItem = {
  id: "c1",
  studentId: "st1",
  sessionId: null,
  sessionDate: null,
  testDate: "2026-11-05",
  kind: "word_retest",
  status: "open",
  memo: "Day 12 12/20점 (기준 16점)",
  doneAt: null,
  createdAt: "2026-11-05T01:00:00Z",
};

function setup() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MyClinicList studentId="st1" />
    </QueryClientProvider>,
  );
}

describe("MyClinicList", () => {
  beforeEach(() => list.mockReset());

  it("lists open and done items without buttons", async () => {
    list.mockResolvedValue([
      base,
      {
        ...base,
        id: "c2",
        kind: "concept_review",
        status: "done",
        memo: null,
        testDate: null,
        sessionDate: "2026-11-02",
        doneAt: "2026-11-04T03:00:00Z",
      },
    ]);
    setup();
    expect(
      await screen.findByRole("heading", { name: "해야 할 보완 1개" }),
    ).toBeInTheDocument();
    expect(screen.getByText("11/5 테스트")).toBeInTheDocument();
    expect(screen.getByText("Day 12 12/20점 (기준 16점)")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "끝낸 보완" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/11\/2 수업 · 11\/4 끝냄/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the empty text", async () => {
    list.mockResolvedValue([]);
    setup();
    expect(
      await screen.findByText("지금은 해야 할 재시험·보완이 없어요."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "끝낸 보완" })).toBeNull();
  });
});
