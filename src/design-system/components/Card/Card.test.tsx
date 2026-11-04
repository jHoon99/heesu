import { render, screen } from "@testing-library/react";
import { Check } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Badge } from "../Badge/Badge";
import { Card } from "./Card";

describe("Card and Badge", () => {
  it("merges className on Card and Badge roots", () => {
    const { container } = render(
      <>
        <Card className="scroll-mt-31">x</Card>
        <Badge className="ml-2">y</Badge>
      </>,
    );
    expect(container.querySelector(".scroll-mt-31")).not.toBeNull();
    expect(container.querySelector(".ml-2")).not.toBeNull();
  });

  it("renders children, and the Badge icon is decorative", () => {
    const { container } = render(
      <>
        <Card>카드 내용</Card>
        <Badge icon={Check}>완료</Badge>
      </>,
    );
    expect(screen.getByText("카드 내용")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
