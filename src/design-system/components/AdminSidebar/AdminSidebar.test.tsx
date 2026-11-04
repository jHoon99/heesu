import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Users, MessageCircle } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar, type AdminSidebarItem } from "./AdminSidebar";

const items: ({ group: string } | AdminSidebarItem)[] = [
  { group: "수업" },
  { value: "students", label: "학생", href: "/admin/students", icon: Users },
  {
    value: "consults",
    label: "상담",
    href: "/admin/consults",
    icon: MessageCircle,
    count: 3,
  },
];

describe("AdminSidebar", () => {
  it("renders a labelled nav with group titles", () => {
    render(<AdminSidebar items={items} />);
    expect(screen.getByRole("navigation", { name: "관리 메뉴" })).toBeVisible();
    expect(screen.getByText("수업")).toBeVisible();
  });

  it("marks only the active link with aria-current and keeps href", () => {
    render(<AdminSidebar items={items} active="students" />);
    const students = screen.getByRole("link", { name: "학생" });
    expect(students).toHaveAttribute("aria-current", "page");
    expect(students).toHaveAttribute("href", "/admin/students");
    expect(screen.getByRole("link", { name: /상담/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("reads the count with a space in the accessible name", () => {
    render(<AdminSidebar items={items} />);
    expect(screen.getByRole("link", { name: "상담 3건" })).toBeVisible();
  });

  it("uses the supplied linkComponent", () => {
    function FakeLink({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: ReactNode;
    }) {
      return (
        <a href={href} data-testid="fake-link" {...rest}>
          {children}
        </a>
      );
    }
    render(<AdminSidebar items={items} linkComponent={FakeLink} />);
    expect(screen.getAllByTestId("fake-link")).toHaveLength(2);
  });

  it("shows 로그아웃 only when onSignOut is given", async () => {
    const onSignOut = vi.fn();
    const { rerender } = render(<AdminSidebar items={items} />);
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
    rerender(<AdminSidebar items={items} onSignOut={onSignOut} />);
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
