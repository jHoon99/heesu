import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "./motion";

describe("Reveal", () => {
  it("becomes visible on mount without waiting for intersection when immediate", async () => {
    render(<Reveal immediate>안녕하세요</Reveal>);
    const el = screen.getByText("안녕하세요");
    await waitFor(() => expect(el.style.opacity).toBe("1"));
  });
});
