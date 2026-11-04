import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authKeys } from "./role";
import { RequireRole } from "./RequireRole";

// useMyRole·TanStack Query는 진짜를 쓰고, 세션과 rpc만 바꿔요.
const replace = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ replace }));
const rpc = vi.hoisted(() => vi.fn());
const useAuthSession = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/core/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("./session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./session")>()),
  useAuthSession,
}));

function renderGuard(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <RequireRole role="admin">관리 화면</RequireRole>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockReset();
  rpc.mockReset();
  useAuthSession.mockReturnValue({
    status: "signedIn",
    session: { user: { id: "u1" } },
  });
});

describe("RequireRole with a cached role from aal1", () => {
  it("does not bounce to /login while the stale null role is refetched", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // /admin을 aal1로 열었을 때 남은 null. 로그인 흐름이 무효로 표시했어요.
    client.setQueryData(authKeys.role("u1"), null);
    await client.invalidateQueries({ queryKey: authKeys.all });
    rpc.mockResolvedValue({ data: "admin", error: null });

    renderGuard(client);
    expect(await screen.findByText("관리 화면")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders at once when the login flow seeded the role", async () => {
    const client = new QueryClient();
    client.setQueryData(authKeys.role("u1"), "admin");
    rpc.mockReturnValue(new Promise(() => {}));
    renderGuard(client);
    expect(screen.getByText("관리 화면")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
