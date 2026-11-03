import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Radio } from "./Radio";

describe("Radio", () => {
  it("switches selection within a group by clicking labels", async () => {
    render(
      <fieldset>
        <legend>동의 방법</legend>
        <Radio name="m" value="written" label="서면" defaultChecked />
        <Radio name="m" value="phone" label="전화" />
      </fieldset>,
    );
    expect(screen.getByRole("group", { name: "동의 방법" })).toBeVisible();
    const written = screen.getByRole("radio", { name: "서면" });
    const phone = screen.getByRole("radio", { name: "전화" });
    expect(written).toBeChecked();
    await userEvent.click(screen.getByText("전화"));
    expect(phone).toBeChecked();
    expect(written).not.toBeChecked();
  });

  it("links the description via aria-describedby", () => {
    render(<Radio name="m" label="카톡" description="카카오톡으로 받아요" />);
    expect(
      screen.getByRole("radio", { name: "카톡" }),
    ).toHaveAccessibleDescription("카카오톡으로 받아요");
  });

  it("marks the radio invalid and shows the error", () => {
    render(<Radio name="m" label="서면" error="하나를 골라 주세요" />);
    const radio = screen.getByRole("radio", { name: "서면" });
    expect(radio).toHaveAttribute("aria-invalid", "true");
    expect(radio).toHaveAccessibleDescription("하나를 골라 주세요");
  });
});
