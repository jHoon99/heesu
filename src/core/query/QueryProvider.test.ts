import { describe, expect, it } from "vitest";
import { createQueryClient, shouldRetryQuery } from "./QueryProvider";

describe("shouldRetryQuery", () => {
  const networkError = new TypeError("Failed to fetch");

  it("retries network errors twice", () => {
    expect(shouldRetryQuery(0, networkError)).toBe(true);
    expect(shouldRetryQuery(1, networkError)).toBe(true);
    expect(shouldRetryQuery(2, networkError)).toBe(false);
  });

  it("does not retry non-network errors", () => {
    expect(shouldRetryQuery(0, { code: "42501" })).toBe(false);
  });
});

describe("createQueryClient", () => {
  it("sets the agreed defaults", () => {
    const d = createQueryClient().getDefaultOptions();
    expect(d.queries?.staleTime).toBe(30_000);
    expect(d.queries?.retry).toBe(shouldRetryQuery);
    expect(d.queries?.refetchOnWindowFocus).toBe(true);
    expect(d.mutations?.retry).toBe(false);
  });
});
