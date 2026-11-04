import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buttonVariants } from "@/design-system";
import { Button } from "./Button";

describe("Button", () => {
  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        저장
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("defaults to the primary variant", () => {
    render(<Button>저장</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("bg-primary");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("exports buttonVariants from the design system", () => {
    expect(buttonVariants({ variant: "primary" })).toContain("bg-primary");
  });

  it("uses the danger hover token", () => {
    render(<Button variant="danger">삭제</Button>);
    expect(screen.getByRole("button", { name: "삭제" }).className).toContain(
      "hover:bg-danger-hover",
    );
  });
});
