import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

const items = [
  { value: "active", label: "재원", count: 3 },
  { value: "paused", label: "휴원" },
  { value: "left", label: "퇴원" },
];

describe("Tabs", () => {
  it("renders tabs with the first selected and a roving tabindex", () => {
    render(<Tabs items={items} ariaLabel="학생 상태" />);
    expect(screen.getByRole("tablist", { name: "학생 상태" })).toBeVisible();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
  });

  it("selects on click and reports the value (uncontrolled)", async () => {
    const onChange = vi.fn();
    render(<Tabs items={items} onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "휴원" }));
    expect(onChange).toHaveBeenCalledWith("paused");
    expect(screen.getByRole("tab", { name: "휴원" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("honours defaultValue", () => {
    render(<Tabs items={items} defaultValue="left" />);
    expect(screen.getByRole("tab", { name: "퇴원" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("moves with arrow keys, wrapping, and Home/End", async () => {
    render(<Tabs items={items} />);
    screen.getAllByRole("tab")[0]!.focus();
    await userEvent.keyboard("{ArrowLeft}");
    const last = screen.getByRole("tab", { name: "퇴원" });
    expect(last).toHaveAttribute("aria-selected", "true");
    expect(last).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: /재원/ })).toHaveFocus();
    expect(screen.getByRole("tab", { name: /재원/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "휴원" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "퇴원" })).toHaveFocus();
  });

  it("stays on the controlled value until the parent changes it", async () => {
    const onChange = vi.fn();
    render(<Tabs items={items} value="active" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "휴원" }));
    expect(onChange).toHaveBeenCalledWith("paused");
    expect(screen.getByRole("tab", { name: /재원/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("follows a controlled parent", async () => {
    function Harness() {
      const [v, setV] = useState("active");
      return <Tabs items={items} value={v} onChange={setV} />;
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole("tab", { name: "퇴원" }));
    expect(screen.getByRole("tab", { name: "퇴원" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the count in the tab name", () => {
    render(<Tabs items={items} />);
    expect(screen.getByRole("tab", { name: /재원.*3/ })).toBeVisible();
  });
});
