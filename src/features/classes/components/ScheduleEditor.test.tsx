import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ScheduleSlot } from "../model/classes";
import { ScheduleEditor } from "./ScheduleEditor";

const slot = (day: number): ScheduleSlot => ({
  day,
  start: "17:00",
  end: "19:00",
});

describe("ScheduleEditor", () => {
  it("appends the default slot", async () => {
    const onChange = vi.fn();
    render(<ScheduleEditor value={[slot(2)]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "시간 추가" }));
    expect(onChange).toHaveBeenCalledWith([slot(2), slot(1)]);
  });

  it("removes only the chosen slot", async () => {
    const onChange = vi.fn();
    render(
      <ScheduleEditor
        value={[slot(1), slot(2), slot(3)]}
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "2번째 시간 삭제" }),
    );
    expect(onChange).toHaveBeenCalledWith([slot(1), slot(3)]);
  });

  it("stores the day as a number", async () => {
    const onChange = vi.fn();
    render(<ScheduleEditor value={[slot(1)]} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("1번째 요일"), "수");
    expect(onChange).toHaveBeenCalledWith([slot(3)]);
  });

  it("updates times through controlled state", () => {
    function Harness() {
      const [v, setV] = useState([slot(1)]);
      return <ScheduleEditor value={v} onChange={setV} />;
    }
    render(<Harness />);
    expect(screen.getByLabelText("1번째 시작 시각")).toHaveValue("17:00");
  });

  it("disables adding at 14 slots", () => {
    const full = Array.from({ length: 14 }, () => slot(1));
    render(<ScheduleEditor value={full} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "시간 추가" })).toBeDisabled();
  });

  it("shows row errors", () => {
    render(
      <ScheduleEditor
        value={[slot(1)]}
        onChange={() => {}}
        errors={[{ end: "끝나는 시각을 시작보다 늦게 적어 주세요." }]}
      />,
    );
    expect(
      screen.getByText("끝나는 시각을 시작보다 늦게 적어 주세요."),
    ).toBeInTheDocument();
  });
});
