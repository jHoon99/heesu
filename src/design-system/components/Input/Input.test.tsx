import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("links the label to the input", () => {
    render(<Input label="연락처" />);
    expect(screen.getByLabelText("연락처")).toBeInstanceOf(HTMLInputElement);
  });

  it("marks error state and points aria-describedby at the message", () => {
    render(
      <Input label="연락처" error="010-0000-0000 형식으로 입력해 주세요." />,
    );
    const input = screen.getByLabelText("연락처");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const msg = screen.getByText("010-0000-0000 형식으로 입력해 주세요.");
    expect(msg.id).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toContain(msg.id);
  });

  it("shows * and sets required when required", () => {
    render(<Input label="이름" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByLabelText(/이름/)).toBeRequired();
  });

  it("renders a textarea when multiline", () => {
    render(<Input label="궁금한 점" multiline />);
    expect(screen.getByLabelText("궁금한 점").tagName).toBe("TEXTAREA");
  });

  it("does not let callers override the aria wiring", () => {
    render(
      <Input
        label="연락처"
        error="010-0000-0000 형식으로 입력해 주세요."
        aria-describedby="evil"
        aria-invalid={false}
      />,
    );
    const input = screen.getByLabelText("연락처");
    const msg = screen.getByText("010-0000-0000 형식으로 입력해 주세요.");
    expect(input.getAttribute("aria-describedby")).toBe(msg.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
