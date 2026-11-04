import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PointsProgress,
  pointsRemaining,
  progressPercent,
} from "./PointsProgress";

describe("pointsRemaining / progressPercent", () => {
  it("computes remaining points", () => {
    expect(pointsRemaining(12, 30)).toBe(18);
    expect(pointsRemaining(30, 30)).toBe(0);
    expect(pointsRemaining(40, 30)).toBe(0);
  });
  it("clamps percent to 0..100", () => {
    expect(progressPercent(12, 30)).toBe(40);
    expect(progressPercent(-3, 30)).toBe(0);
    expect(progressPercent(45, 30)).toBe(100);
    expect(progressPercent(5, 0)).toBe(100);
  });
});

describe("PointsProgress", () => {
  it("shows points, remaining text, rank and an accessible bar", () => {
    render(<PointsProgress points={12} goal={30} rank={2} rankTotal={8} />);
    expect(screen.getByLabelText("12")).toBeInTheDocument();
    expect(screen.getByText("보상까지 18점 남았어요")).toBeVisible();
    expect(screen.getByText("전체 8명 중 2등")).toBeVisible();
    const bar = screen.getByRole("progressbar", { name: "보상까지 진행" });
    expect(bar).toHaveAttribute("aria-valuenow", "12");
    expect(bar).toHaveAttribute("aria-valuemax", "30");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
  });

  it("shows the achieved message at the goal", () => {
    render(<PointsProgress points={30} goal={30} />);
    expect(
      screen.getByText("보상 목표를 달성했어요! 원장님께 말씀해 주세요."),
    ).toBeVisible();
  });

  it("hides the rank line without rank or without total", () => {
    const { rerender } = render(<PointsProgress points={12} goal={30} />);
    expect(screen.queryByText(/명 중/)).not.toBeInTheDocument();
    rerender(<PointsProgress points={12} goal={30} rank={2} />);
    expect(screen.queryByText(/명 중/)).not.toBeInTheDocument();
  });

  it("hides rank in compact mode", () => {
    render(
      <PointsProgress points={12} goal={30} rank={2} rankTotal={8} compact />,
    );
    expect(screen.queryByText(/명 중/)).not.toBeInTheDocument();
  });

  it("shows delta", () => {
    render(<PointsProgress points={12} goal={30} delta={1} />);
    expect(screen.getByText("+1점")).toBeVisible();
  });
});
