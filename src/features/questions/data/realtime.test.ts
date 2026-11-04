import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    ons: [] as { type: string; filter: Record<string, unknown> }[],
    statusCb: null as ((s: string) => void) | null,
    resolveAuth: null as (() => void) | null,
  };
  const chain: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  } = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  return {
    state,
    chain,
    channel: vi.fn(),
    removeChannel: vi.fn(),
    setAuth: vi.fn(),
  };
});
vi.mock("@/core/supabase/client", () => ({
  supabase: {
    channel: h.channel,
    removeChannel: h.removeChannel,
    realtime: { setAuth: h.setAuth },
  },
}));

import { questionTopic, subscribeQuestionChanges } from "./realtime";

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.state.ons = [];
  h.state.statusCb = null;
  h.channel.mockReset();
  h.removeChannel.mockReset();
  h.setAuth.mockReset();
  h.setAuth.mockResolvedValue(undefined);
  h.chain.on.mockReset();
  h.chain.subscribe.mockReset();
  h.chain.on.mockImplementation(
    (type: string, filter: Record<string, unknown>) => {
      h.state.ons.push({ type, filter });
      return h.chain;
    },
  );
  h.chain.subscribe.mockImplementation((cb: (s: string) => void) => {
    h.state.statusCb = cb;
    return h.chain;
  });
  h.channel.mockReturnValue(h.chain);
});

describe("subscribeQuestionChanges", () => {
  it("admin: private topic, unfiltered questions", async () => {
    subscribeQuestionChanges({ kind: "admin" }, vi.fn());
    await flush();
    expect(h.channel).toHaveBeenCalledWith("questions:admin", {
      config: { private: true },
    });
    expect(h.state.ons).toEqual([
      {
        type: "postgres_changes",
        filter: {
          event: "*",
          schema: "public",
          table: "questions",
          filter: undefined,
        },
      },
      {
        type: "postgres_changes",
        filter: { event: "*", schema: "public", table: "answers" },
      },
    ]);
  });

  it("student: topic and student_id filter", async () => {
    const scope = { kind: "student", studentId: "s1" } as const;
    expect(questionTopic(scope)).toBe("questions:student:s1");
    subscribeQuestionChanges(scope, vi.fn());
    await flush();
    expect(h.channel).toHaveBeenCalledWith("questions:student:s1", {
      config: { private: true },
    });
    expect(h.state.ons[0]?.filter.filter).toBe("student_id=eq.s1");
  });

  it("calls onChange only when SUBSCRIBED", async () => {
    const onChange = vi.fn();
    subscribeQuestionChanges({ kind: "admin" }, onChange);
    await flush();
    h.state.statusCb?.("CHANNEL_ERROR");
    expect(onChange).not.toHaveBeenCalled();
    h.state.statusCb?.("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe removes the channel once", async () => {
    const off = subscribeQuestionChanges({ kind: "admin" }, vi.fn());
    await flush();
    off();
    off();
    expect(h.removeChannel).toHaveBeenCalledTimes(1);
    expect(h.removeChannel).toHaveBeenCalledWith(h.chain);
  });

  it("unsubscribe before setAuth resolves never creates a channel", async () => {
    let resolve!: () => void;
    h.setAuth.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const off = subscribeQuestionChanges({ kind: "admin" }, vi.fn());
    off();
    resolve();
    await flush();
    expect(h.channel).toHaveBeenCalledTimes(0);
    expect(h.removeChannel).toHaveBeenCalledTimes(0);
  });
});
