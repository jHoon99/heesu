import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("toggles when the label is clicked", async () => {
    render(<Checkbox label="단어 외우기" />);
    const box = screen.getByRole("checkbox", { name: "단어 외우기" });
    expect(box).not.toBeChecked();
    await userEvent.click(screen.getByText("단어 외우기"));
    expect(box).toBeChecked();
    await userEvent.click(screen.getByText("단어 외우기"));
    expect(box).not.toBeChecked();
  });

  it("shows an error and marks the box invalid", () => {
    render(
      <Checkbox
        label="보호자가 작성합니다 (필수)"
        error="보호자만 신청할 수 있어요. 확인란을 체크해 주세요."
      />,
    );
    const box = screen.getByRole("checkbox", {
      name: "보호자가 작성합니다 (필수)",
    });
    const msg = screen.getByText(
      "보호자만 신청할 수 있어요. 확인란을 체크해 주세요.",
    );
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box.getAttribute("aria-describedby")).toContain(msg.id);
  });

  it("describes the box by both description and error", () => {
    render(
      <Checkbox
        label="동의해요"
        description="언제든 철회할 수 있어요."
        error="동의가 필요해요."
      />,
    );
    const box = screen.getByRole("checkbox", { name: "동의해요" });
    const desc = screen.getByText("언제든 철회할 수 있어요.");
    const err = screen.getByText("동의가 필요해요.");
    expect(box).toHaveAttribute("aria-describedby", `${desc.id} ${err.id}`);
    expect(box).toHaveAttribute("aria-invalid", "true");
  });

  it("merges a caller aria-describedby and respects a caller aria-invalid", () => {
    const { rerender } = render(
      <Checkbox
        label="동의해요"
        description="설명이에요."
        aria-describedby="extra"
      />,
    );
    const box = screen.getByRole("checkbox", { name: "동의해요" });
    const desc = screen.getByText("설명이에요.");
    expect(box).toHaveAttribute("aria-describedby", `extra ${desc.id}`);
    expect(box).not.toHaveAttribute("aria-invalid");

    rerender(<Checkbox label="동의해요" aria-invalid />);
    expect(box).toHaveAttribute("aria-invalid", "true");
  });
});
