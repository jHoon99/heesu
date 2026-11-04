import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConsultationRecord } from "../../model/adminConsultation";
import { ConsultationTable } from "./ConsultationTable";

const row: ConsultationRecord = {
  id: "c1",
  parentName: "김부모",
  phone: "010-0000-0091",
  grade: "중2",
  message: "x".repeat(1000),
  status: "new",
  memo: null,
  createdAt: "2026-11-03T15:05:00Z",
};

describe("ConsultationTable", () => {
  // sr-only(absolute) 머리글이 가로 스크롤 상자 밖 페이지를 넓히지 않게, 스크롤 상자가 기준 위치가 된다.
  it("keeps the hidden header inside its scroll container", () => {
    render(<ConsultationTable rows={[row]} onOpen={vi.fn()} />);
    const scroller = screen.getByRole("table").parentElement;
    expect(scroller).toHaveClass("overflow-x-auto", "relative");
    expect(scroller).toContainElement(
      screen.getByRole("columnheader", { name: "보기" }),
    );
  });
});
