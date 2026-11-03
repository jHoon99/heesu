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
});
