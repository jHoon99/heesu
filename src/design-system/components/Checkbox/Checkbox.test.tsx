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
});
