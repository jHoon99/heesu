import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("is an alert for danger and a status otherwise", () => {
    const { rerender } = render(<Toast tone="danger">실패했어요.</Toast>);
    expect(screen.getByRole("alert")).toHaveTextContent("실패했어요.");
    rerender(<Toast>저장했어요.</Toast>);
    expect(screen.getByRole("status")).toHaveTextContent("저장했어요.");
  });

  it("renders the action only when actionLabel is given", async () => {
    const onAction = vi.fn();
    const { rerender } = render(<Toast>지웠어요.</Toast>);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <Toast actionLabel="되돌리기" onAction={onAction}>
        지웠어요.
      </Toast>,
    );
    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
