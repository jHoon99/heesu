import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSiteContent } from "../data/getSiteContent";
import { EMPTY_SITE_CONTENT } from "../model/siteContent";
import { useSiteContent } from "./useSiteContent";

vi.mock("../data/getSiteContent");

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
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
    const { result } = renderHook(() => useSiteContent(), {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(result.current.content.contact.phone).toBe("063-000-0000"),
    );
  });

  it("falls back to empty content when the fetch fails", async () => {
    vi.mocked(getSiteContent).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const { result } = renderHook(() => useSiteContent(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.content).toEqual(EMPTY_SITE_CONTENT);
    expect(result.current.isSuccess).toBe(false);
  });

  it("is loading with empty content until the request finishes", async () => {
    let resolve!: (rows: { key: string; value: unknown }[]) => void;
    vi.mocked(getSiteContent).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );
    const { result } = renderHook(() => useSiteContent(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.content).toBe(EMPTY_SITE_CONTENT);
    resolve([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("falls back to defaults for a malformed row", async () => {
    vi.mocked(getSiteContent).mockResolvedValue([
      { key: "tuition", value: "x" },
    ]);
    const { result } = renderHook(() => useSiteContent(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.content.tuition).toEqual(EMPTY_SITE_CONTENT.tuition);
  });
});
