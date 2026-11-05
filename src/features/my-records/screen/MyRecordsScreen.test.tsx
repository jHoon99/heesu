import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyRecordsScreen, parseRecordTab } from "./MyRecordsScreen";

let search = new URLSearchParams();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}));
vi.mock("@/features/auth", () => ({
  useMyStudent: () => ({ data: { id: "st1" } }),
}));
vi.mock("@/features/test-records", () => ({
  MyTestList: ({ studentId }: { studentId: string }) => (
    <p>{`테스트 목록 ${studentId}`}</p>
  ),
}));
vi.mock("@/features/clinic", () => ({
  MyClinicList: ({ studentId }: { studentId: string }) => (
    <p>{`클리닉 목록 ${studentId}`}</p>
  ),
}));

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MyRecordsScreen />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("MyRecordsScreen", () => {
  beforeEach(() => {
    replace.mockReset();
    search = new URLSearchParams();
  });

  it("shows tests by default and switches through the address", async () => {
    const user = setup();
    expect(screen.getByText("테스트 목록 st1")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "클리닉" }));
    expect(replace).toHaveBeenCalledWith("/s/records?tab=clinic", {
      scroll: false,
    });
  });

  it("shows the clinic tab from the address", () => {
    search = new URLSearchParams("tab=clinic");
    setup();
    expect(screen.getByText("클리닉 목록 st1")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "클리닉" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("parses unknown tabs as tests", () => {
    expect(parseRecordTab("x")).toBe("tests");
    expect(parseRecordTab(null)).toBe("tests");
  });
});
