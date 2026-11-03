import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "./session";

type Listener = (event: string, session: unknown) => void;
const auth = vi.hoisted(() => ({
  listener: null as Listener | null,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/core/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: auth.getSession,
      onAuthStateChange: auth.onAuthStateChange,
    },
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));

const session = (id: string) => ({ user: { id } });

function setup() {
  const client = new QueryClient();
  const clear = vi.spyOn(client, "clear");
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useAuthSession(), { wrapper });
  const emit = (event: string, s: unknown) =>
    act(() => auth.listener?.(event, s));
  return { hook, clear, invalidate, emit };
}

beforeEach(() => {
  auth.listener = null;
  auth.getSession.mockReset();
  auth.onAuthStateChange.mockReset();
  auth.getSession.mockResolvedValue({ data: { session: session("u1") } });
  auth.onAuthStateChange.mockImplementation((cb: Listener) => {
    auth.listener = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
});

describe("useAuthSession", () => {
  it("reports the stored session", async () => {
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.status).toBe("signedIn"));
  });

  it("clears the whole query cache on SIGNED_OUT (other tab, revoked token)", async () => {
    const { hook, clear, invalidate, emit } = setup();
    emit("INITIAL_SESSION", session("u1"));
    emit("SIGNED_OUT", null);
    expect(hook.result.current.status).toBe("signedOut");
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("clears the cache when a different user signs in", async () => {
    const { clear, emit } = setup();
    emit("INITIAL_SESSION", session("u1"));
    emit("SIGNED_IN", session("u2"));
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));
  });

  it("only invalidates auth queries when the same user refreshes", async () => {
    const { clear, invalidate, emit } = setup();
    emit("INITIAL_SESSION", session("u1"));
    emit("TOKEN_REFRESHED", session("u1"));
    emit("MFA_CHALLENGE_VERIFIED", session("u1"));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth"] });
    expect(clear).not.toHaveBeenCalled();
  });
});
