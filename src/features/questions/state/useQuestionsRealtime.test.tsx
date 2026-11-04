import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ subscribe: vi.fn() }));
vi.mock("../data/realtime", async (orig) => ({
  ...(await orig<typeof import("../data/realtime")>()),
  subscribeQuestionChanges: h.subscribe,
}));

import { useQuestionsRealtime } from "./useQuestionsRealtime";
import type { QuestionScope } from "../data/realtime";

let active = 0;
let onChange: () => void = () => {};
beforeEach(() => {
  active = 0;
  h.subscribe.mockReset();
  h.subscribe.mockImplementation((_s: QuestionScope, cb: () => void) => {
    active += 1;
    onChange = cb;
    return () => {
      active -= 1;
    };
  });
});

function Probe({ scope }: { scope: QuestionScope | null }) {
  useQuestionsRealtime(scope);
  return null;
}

function setup(scope: () => QuestionScope | null) {
  const client = new QueryClient();
  const spy = vi.spyOn(client, "invalidateQueries");
  const wrap = (s: QuestionScope | null) => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <Probe scope={s} />
      </QueryClientProvider>
    </StrictMode>
  );
  const view = render(wrap(scope()));
  return { view, spy, rerender: () => view.rerender(wrap(scope())) };
}

describe("useQuestionsRealtime", () => {
  it("keeps exactly one active subscription under StrictMode and releases on unmount", () => {
    const { view, rerender } = setup(() => ({ kind: "admin" }));
    expect(active).toBe(1);
    const calls = h.subscribe.mock.calls.length;
    rerender(); // new scope object, same topic
    expect(h.subscribe.mock.calls.length).toBe(calls);
    view.unmount();
    expect(active).toBe(0);
  });

  it("invalidates all question queries on change", () => {
    const { spy } = setup(() => ({ kind: "admin" }));
    onChange();
    expect(spy).toHaveBeenCalledWith({ queryKey: ["questions"] });
  });

  it("does not subscribe without a scope", () => {
    setup(() => null);
    expect(h.subscribe).not.toHaveBeenCalled();
  });
});
