import { render, screen, within } from "@testing-library/react";
import {
  BookOpen,
  CirclePlay,
  House,
  MessageCircleQuestionMark,
  User,
} from "lucide-react";
import { describe, expect, it } from "vitest";
import { StudentTabBar, type StudentTabItem } from "./StudentTabBar";

const items: StudentTabItem[] = [
  { value: "home", label: "홈", href: "/s", icon: House },
  { value: "homework", label: "숙제", href: "/s/homework", icon: BookOpen },
  { value: "videos", label: "영상", href: "/s/videos", icon: CirclePlay },
  {
    value: "questions",
    label: "질문",
    href: "/s/questions",
    icon: MessageCircleQuestionMark,
  },
  { value: "me", label: "내 정보", href: "/s/me", icon: User },
];

describe("StudentTabBar", () => {
  it("renders five labelled links with their hrefs", () => {
    render(<StudentTabBar items={items} />);
    const nav = screen.getByRole("navigation", { name: "학생 메뉴" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links.map((l) => l.textContent)).toEqual([
      "홈",
      "숙제",
      "영상",
      "질문",
      "내 정보",
    ]);
    expect(screen.getByRole("link", { name: "숙제" })).toHaveAttribute(
      "href",
      "/s/homework",
    );
  });

  it("marks only the active tab with aria-current", () => {
    render(<StudentTabBar items={items} active="homework" />);
    expect(screen.getByRole("link", { name: "숙제" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "홈" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("announces a dot only on the tab that has one", () => {
    const withDot = items.map((i) =>
      i.value === "questions" ? { ...i, dot: true } : i,
    );
    render(<StudentTabBar items={withDot} />);
    expect(screen.getByRole("link", { name: /새 소식/ })).toHaveAttribute(
      "href",
      "/s/questions",
    );
    expect(screen.getAllByRole("link", { name: /새 소식/ })).toHaveLength(1);
  });

  it("draws at most five items", () => {
    const six = [
      ...items,
      { value: "x", label: "여섯째", href: "/s/x", icon: User },
    ];
    render(<StudentTabBar items={six} />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByText("여섯째")).not.toBeInTheDocument();
  });

  it("passes href to a custom link component", () => {
    render(
      <StudentTabBar
        items={items}
        linkComponent={({
          href,
          ...p
        }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
          href: string;
        }) => <a data-testid="custom" href={href} {...p} />}
      />,
    );
    const custom = screen.getAllByTestId("custom");
    expect(custom).toHaveLength(5);
    expect(custom[1]).toHaveAttribute("href", "/s/homework");
  });
});
