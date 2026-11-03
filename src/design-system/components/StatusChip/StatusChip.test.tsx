import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatusChip, nextAttendance, nextHomework } from "./StatusChip";

describe("StatusChip", () => {
  it("renders text and an icon together (never color alone)", () => {
    const { container } = render(<StatusChip status="late" />);
    expect(screen.getByText("지각")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it.each([
    ["none", "미입력"],
    ["present", "출석"],
    ["late", "지각"],
    ["absent", "결석"],
    ["makeup", "보강"],
    ["done", "완료"],
    ["missing", "미완료"],
  ] as const)("%s shows %s with an icon", (status, text) => {
    const { container } = render(<StatusChip status={status} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is a button only when onClick is given", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<StatusChip status="present" />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <StatusChip
        status="present"
        onClick={onClick}
        ariaLabel="하늘 11/3 출석"
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "하늘 11/3 출석 출석" }),
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prefixes ariaLabel to the status word on interactive chips", () => {
    render(
      <StatusChip
        status="late"
        ariaLabel="김하늘 11월 4일 출결"
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "김하늘 11월 4일 출결 지각" }),
    ).toBeInTheDocument();
  });

  it("keeps a non-interactive chip readable without aria-label", () => {
    const { container } = render(<StatusChip status="done" ariaLabel="숙제" />);
    const chip = container.firstElementChild!;
    expect(chip).not.toHaveAttribute("aria-label");
    expect(chip).toHaveTextContent("숙제 완료");
  });
});

describe("status cycles", () => {
  it("attendance cycles none→present→late→absent→makeup→none", () => {
    expect(nextAttendance("none")).toBe("present");
    expect(nextAttendance("present")).toBe("late");
    expect(nextAttendance("late")).toBe("absent");
    expect(nextAttendance("absent")).toBe("makeup");
    expect(nextAttendance("makeup")).toBe("none");
  });
  it("homework cycles none→done→missing→none", () => {
    expect(nextHomework("none")).toBe("done");
    expect(nextHomework("done")).toBe("missing");
    expect(nextHomework("missing")).toBe("none");
  });
});
