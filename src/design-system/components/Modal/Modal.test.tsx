import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const footer = [
  <button key="c">취소</button>,
  <button key="o">퇴원 처리</button>,
];

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(<Modal open={false} title="퇴원 처리할까요?" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a modal dialog labelled by its title with focus inside", () => {
    render(
      <Modal open title="퇴원 처리할까요?" footer={footer}>
        본문
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "퇴원 처리할까요?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("locks body scroll while open and releases it on close", () => {
    const { rerender } = render(<Modal open title="제목" />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Modal open={false} title="제목" />);
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape once", async () => {
    const onClose = vi.fn();
    render(<Modal open title="제목" onClose={onClose} footer={footer} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on scrim click but not on clicks inside the dialog", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="제목" onClose={onClose}>
        <p>본문</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(screen.getByText("본문"));
    await userEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(0);
    await userEvent.click(dialog.parentElement!.firstElementChild!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with the 닫기 button", async () => {
    const onClose = vi.fn();
    render(<Modal open title="제목" onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cycles Tab within the dialog", async () => {
    render(<Modal open title="제목" footer={footer} />);
    const first = screen.getByRole("button", { name: "닫기" });
    expect(first).toHaveFocus();
    screen.getByRole("button", { name: "퇴원 처리" }).focus();
    await userEvent.tab();
    expect(first).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "퇴원 처리" })).toHaveFocus();
  });

  it("returns focus to the opener when closed", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>열기</button>
          <Modal open={open} title="제목" onClose={() => setOpen(false)} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "열기" });
    await userEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
