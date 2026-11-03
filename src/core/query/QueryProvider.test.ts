import { describe, expect, it } from "vitest";
import { shouldRetryQuery } from "./QueryProvider";

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
