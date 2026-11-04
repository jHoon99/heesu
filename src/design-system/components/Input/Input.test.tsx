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

  it("links the hint and swaps it for the error", () => {
    const { rerender } = render(
      <Input label="연락처" hint="숫자만 입력해요." />,
    );
    const input = screen.getByLabelText("연락처");
    const hint = screen.getByText("숫자만 입력해요.");
    expect(input).toHaveAttribute("aria-describedby", hint.id);
    expect(input).not.toHaveAttribute("aria-invalid");

    rerender(
      <Input
        label="연락처"
        hint="숫자만 입력해요."
        error="형식이 맞지 않아요."
      />,
    );
    const error = screen.getByText("형식이 맞지 않아요.");
    expect(error.id).toBe(hint.id);
    expect(screen.queryByText("숫자만 입력해요.")).toBeNull();
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("wires a multiline Input like a single-line one", () => {
    render(
      <Input
        label="궁금한 점"
        multiline
        required
        error="내용을 적어 주세요."
      />,
    );
    const area = screen.getByLabelText(/궁금한 점/);
    const msg = screen.getByText("내용을 적어 주세요.");
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toBeRequired();
    expect(area).toHaveAttribute("aria-invalid", "true");
    expect(area).toHaveAttribute("aria-describedby", msg.id);
  });

  it("merges a caller aria-describedby with its own message id", () => {
    render(
      <Input
        label="연락처"
        error="형식이 맞지 않아요."
        aria-describedby="extra"
      />,
    );
    const msg = screen.getByText("형식이 맞지 않아요.");
    expect(screen.getByLabelText("연락처")).toHaveAttribute(
      "aria-describedby",
      `extra ${msg.id}`,
    );
  });

  it("keeps a caller aria-describedby and aria-invalid when there is no message", () => {
    render(<Input label="연락처" aria-describedby="extra" aria-invalid />);
    const input = screen.getByLabelText("연락처");
    expect(input).toHaveAttribute("aria-describedby", "extra");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("an error always marks the input invalid", () => {
    render(
      <Input label="연락처" error="형식이 맞지 않아요." aria-invalid={false} />,
    );
    expect(screen.getByLabelText("연락처")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
