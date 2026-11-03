import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markPasswordChanged, updateMyPassword } from "../data/student";
import { useChangeFirstPassword } from "./useChangeFirstPassword";

vi.mock("../data/student");

const update = vi.mocked(updateMyPassword);
const mark = vi.mocked(markPasswordChanged);

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useChangeFirstPassword(), { wrapper });
}

describe("useChangeFirstPassword", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    update.mockResolvedValue();
    mark.mockResolvedValue();
  });

  it("updates the password then marks it changed", async () => {
    const { result } = setup();
    await act(() => result.current.mutateAsync("new-pass-1"));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("new-pass-1");
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it("skips updateUser when retrying the same password after the flag call failed", async () => {
    mark.mockRejectedValueOnce(new Error("boom"));
    const { result } = setup();
    await act(() => result.current.mutateAsync("new-pass-1").catch(() => {}));
    await waitFor(() => expect(result.current.isError).toBe(true));
    await act(() => result.current.mutateAsync("new-pass-1"));
    expect(update).toHaveBeenCalledTimes(1);
    expect(mark).toHaveBeenCalledTimes(2);
  });

  it("applies a different password again after the flag call failed", async () => {
    mark.mockRejectedValueOnce(new Error("boom"));
    const { result } = setup();
    await act(() => result.current.mutateAsync("new-pass-1").catch(() => {}));
    await act(() => result.current.mutateAsync("other-pass-2"));
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith("other-pass-2");
    expect(mark).toHaveBeenCalledTimes(2);
  });

  it("does not remember a password whose updateUser failed", async () => {
    update.mockRejectedValueOnce({ code: "weak_password" });
    const { result } = setup();
    await act(() => result.current.mutateAsync("new-pass-1").catch(() => {}));
    expect(mark).not.toHaveBeenCalled();
    await act(() => result.current.mutateAsync("new-pass-1"));
    expect(update).toHaveBeenCalledTimes(2);
  });
});
