import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSiteContent } from "../data/getSiteContent";
import { EMPTY_SITE_CONTENT } from "../model/siteContent";
import { useSiteContent } from "./useSiteContent";

vi.mock("../data/getSiteContent");

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSiteContent", () => {
  beforeEach(() => {
    vi.mocked(getSiteContent).mockReset();
  });

  it("parses fetched rows", async () => {
    vi.mocked(getSiteContent).mockResolvedValue([
      { key: "contact", value: { phone: "063-000-0000", address: "전주" } },
    ]);
    const { result } = renderHook(() => useSiteContent(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.content.contact.phone).toBe("063-000-0000"));
  });

  it("falls back to empty content when the fetch fails", async () => {
    vi.mocked(getSiteContent).mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useSiteContent(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.content).toEqual(EMPTY_SITE_CONTENT);
    expect(result.current.isSuccess).toBe(false);
  });
});
