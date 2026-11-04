import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VideoCard, clampProgress } from "./VideoCard";

describe("clampProgress", () => {
  it("keeps undefined and clamps to a 0-100 integer", () => {
    expect(clampProgress(undefined)).toBeUndefined();
    expect(clampProgress(-3)).toBe(0);
    expect(clampProgress(45.6)).toBe(46);
    expect(clampProgress(130)).toBe(100);
  });
});

describe("VideoCard", () => {
  it("renders a link with the given href", () => {
    render(<VideoCard title="현재완료" href="/s/videos/watch?id=v1" />);
    expect(screen.getByRole("link", { name: /현재완료/ })).toHaveAttribute(
      "href",
      "/s/videos/watch?id=v1",
    );
  });

  it("passes href to linkComponent", () => {
    const Probe = ({
      href,
      children,
      className,
    }: {
      href: string;
      children: ReactNode;
      className?: string;
    }) => (
      <span data-testid="probe" data-href={href} className={className}>
        {children}
      </span>
    );
    render(<VideoCard title="현재완료" href="/x" linkComponent={Probe} />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-href", "/x");
  });

  it("renders a button when only onClick is given", () => {
    const onClick = vi.fn();
    render(<VideoCard title="현재완료" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /현재완료/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is not interactive without href or onClick", () => {
    render(<VideoCard title="현재완료" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a progressbar for partial progress", () => {
    render(<VideoCard title="현재완료" progress={45} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "45",
    );
    expect(screen.getByText("45% 봤어요")).toBeInTheDocument();
  });

  it("shows the finished label at 100", () => {
    render(<VideoCard title="현재완료" progress={100} />);
    expect(screen.getByText("다 봤어요")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows no progress at 0", () => {
    render(<VideoCard title="현재완료" progress={0} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("다 봤어요")).toBeNull();
  });

  it("shows new badge, duration and unit", () => {
    render(<VideoCard title="t" isNew duration="12:40" unit="Unit 4" />);
    expect(screen.getByText("새 영상")).toBeInTheDocument();
    expect(screen.getByText("12:40")).toBeInTheDocument();
    expect(screen.getByText("Unit 4")).toBeInTheDocument();
  });

  it("uses a fixed-width thumbnail in row layout only", () => {
    const { container, rerender } = render(<VideoCard title="t" />);
    expect(container.querySelector(".w-28")).toBeNull();
    rerender(<VideoCard title="t" layout="row" />);
    expect(container.querySelector(".w-28.shrink-0")).not.toBeNull();
    expect(container.firstElementChild).toHaveClass("flex");
  });
});
