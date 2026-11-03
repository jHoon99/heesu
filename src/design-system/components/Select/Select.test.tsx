import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("labels the select, shows a disabled empty placeholder, and marks errors", () => {
    render(
      <Select
        label="학년"
        placeholder="학년을 골라 주세요"
        options={["중1", { value: "h1", label: "고1" }]}
        error="학년을 골라 주세요."
        required
        defaultValue=""
      />,
    );
    const sel = screen.getByLabelText(/학년/);
    expect(
      within(sel).getByRole("option", { name: "학년을 골라 주세요" }),
    ).toBeDisabled();
    expect(within(sel).getByRole("option", { name: "고1" })).toHaveAttribute(
      "value",
      "h1",
    );
    expect(sel).toHaveAttribute("aria-invalid", "true");
  });

  it("merges a caller aria-describedby with the message id", () => {
    render(
      <Select
        label="학년"
        options={["중1"]}
        hint="재원 중인 학년이에요."
        aria-describedby="extra"
      />,
    );
    const hint = screen.getByText("재원 중인 학년이에요.");
    expect(screen.getByLabelText("학년")).toHaveAttribute(
      "aria-describedby",
      `extra ${hint.id}`,
    );
  });

  it("respects a caller aria-invalid when there is no error", () => {
    render(<Select label="학년" options={["중1"]} aria-invalid />);
    expect(screen.getByLabelText("학년")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
