import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendanceTable, summarizeAttendanceRow } from "./AttendanceTable";

const students = [
  { id: "s1", name: "김하늘", meta: "중2" },
  { id: "s2", name: "이도윤" },
];
const dates = [
  { key: "d1", label: "11/3", day: "월" },
  { key: "d2", label: "11/5", day: "수", today: true },
];

describe("AttendanceTable", () => {
  it("renders one button per cell named by student, date and status", () => {
    render(<AttendanceTable students={students} dates={dates} />);
    expect(
      screen.getByRole("button", { name: "김하늘 11/5 출결 미입력" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(8);
    expect(screen.getByText("중2")).toBeInTheDocument();
  });

  it("cycles attendance none→present→late→absent→makeup→none when uncontrolled", async () => {
    const onChange = vi.fn();
    render(
      <AttendanceTable students={students} dates={dates} onChange={onChange} />,
    );
    const expected = ["출석", "지각", "결석", "보강", "미입력"];
    for (const word of expected) {
      await userEvent.click(
        screen.getByRole("button", { name: /^김하늘 11\/3 출결 / }),
      );
      expect(
        screen.getByRole("button", { name: `김하늘 11/3 출결 ${word}` }),
      ).toBeInTheDocument();
    }
    expect(onChange).toHaveBeenNthCalledWith(1, "s1", "d1", "att", "present");
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it("marks a student-submitted homework cell and keeps click-to-cycle", async () => {
    const onChange = vi.fn();
    render(
      <AttendanceTable
        students={students}
        dates={dates}
        onChange={onChange}
        defaultRecords={{
          s1: { d1: { hw: "none", submittedAt: "2026-11-04T06:30:00Z" } },
        }}
      />,
    );
    const btn = screen.getByRole("button", {
      name: "김하늘 11/3 숙제, 학생 제출 11/4 15:30 미입력",
    });
    expect(btn.closest("span[title]")).toHaveAttribute(
      "title",
      "학생 제출 11/4 15:30",
    );
    expect(
      screen.getByRole("button", { name: "이도윤 11/3 숙제 미입력" }),
    ).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith("s1", "d1", "hw", "done");
  });

  it("cycles homework none→done→missing→none", async () => {
    render(<AttendanceTable students={students} dates={dates} />);
    for (const word of ["완료", "미완료", "미입력"]) {
      await userEvent.click(
        screen.getByRole("button", { name: /^김하늘 11\/3 숙제 / }),
      );
      expect(
        screen.getByRole("button", { name: `김하늘 11/3 숙제 ${word}` }),
      ).toBeInTheDocument();
    }
  });

  it("keeps controlled records until the parent updates them", async () => {
    const onChange = vi.fn();
    render(
      <AttendanceTable
        students={students}
        dates={dates}
        records={{ s1: { d1: { att: "late" } } }}
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "김하늘 11/3 출결 지각" }),
    );
    expect(onChange).toHaveBeenCalledWith("s1", "d1", "att", "absent");
    expect(
      screen.getByRole("button", { name: "김하늘 11/3 출결 지각" }),
    ).toBeInTheDocument();
  });

  it("hides homework cells when showHomework is false", () => {
    render(
      <AttendanceTable
        students={students}
        dates={dates}
        showHomework={false}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("columnheader", { name: "숙제" })).toBeNull();
  });

  it("marks today's column header", () => {
    render(<AttendanceTable students={students} dates={dates} />);
    expect(
      screen.getByRole("columnheader", { name: /11\/5/ }).className,
    ).toContain("bg-brown-100");
  });

  it("shows both row summaries and flags rates under 60% beyond color", () => {
    render(
      <AttendanceTable
        students={students}
        dates={dates}
        defaultRecords={{
          s1: {
            d1: { att: "present", hw: "done" },
            d2: { att: "absent", hw: "missing" },
          },
        }}
      />,
    );
    const row = screen.getByRole("row", { name: /김하늘/ });
    const att = within(row).getByText("출석 1/2 · 50%");
    const hw = within(row).getByText("숙제 1/2 · 50%");
    expect(att.className).toContain("text-danger-700");
    expect(hw.className).toContain("text-danger-700");
    expect(within(row).getAllByText("60% 미만")).toHaveLength(2);
    const other = screen.getByRole("row", { name: /이도윤/ });
    expect(within(other).getByText("출석 –")).toBeInTheDocument();
    expect(within(other).queryByText("60% 미만")).toBeNull();
  });

  it("applies maxHeight to the scroll container", () => {
    const { container } = render(
      <AttendanceTable students={students} dates={dates} maxHeight={200} />,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain("overflow-auto");
    expect(wrap.style.maxHeight).toBe("200px");
  });

  it("renders the legend with seven fixed status names", () => {
    render(<AttendanceTable.Legend />);
    const legend = screen.getByLabelText("범례");
    for (const t of [
      "출석",
      "지각",
      "결석",
      "보강",
      "숙제 완료",
      "숙제 미완료",
      "미입력",
    ])
      expect(within(legend).getByText(t)).toBeInTheDocument();
  });
});

describe("summarizeAttendanceRow", () => {
  it("counts late and makeup as attended and ignores none", () => {
    expect(
      summarizeAttendanceRow([
        { att: "present", hw: "done" },
        { att: "late", hw: "missing" },
        { att: "absent" },
        { att: "makeup", hw: "done" },
        undefined,
        { att: "none", hw: "none" },
      ]),
    ).toEqual({
      attended: 3,
      entered: 4,
      hwDone: 2,
      hwEntered: 3,
      attLow: false,
      hwLow: false,
    });
  });

  it("treats exactly 60% as not low and no input as not low", () => {
    const five = [
      { att: "present" },
      { att: "present" },
      { att: "present" },
      { att: "absent" },
      { att: "absent" },
    ] as const;
    expect(summarizeAttendanceRow([...five]).attLow).toBe(false);
    expect(summarizeAttendanceRow([...five.slice(2)]).attLow).toBe(true);
    expect(summarizeAttendanceRow([])).toEqual({
      attended: 0,
      entered: 0,
      hwDone: 0,
      hwEntered: 0,
      attLow: false,
      hwLow: false,
    });
  });
});
