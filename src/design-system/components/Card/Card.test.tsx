import { render } from "@testing-library/react";
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
});
