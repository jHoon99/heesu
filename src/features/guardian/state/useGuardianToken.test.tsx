import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useGuardianToken } from "./useGuardianToken";

const tok = "A".repeat(10) + "b-_".repeat(11);
const KEY = "hs-guardian-token";

beforeEach(() => {
  sessionStorage.clear();
  history.replaceState(null, "", "/g");
});

describe("useGuardianToken", () => {
  it("takes the fragment token, stores it and clears the address bar", () => {
    history.replaceState(null, "", `/g#t=${tok}`);
    const { result } = renderHook(() => useGuardianToken());
    expect(result.current.ready).toBe(true);
    expect(result.current.token).toBe(tok);
    expect(location.hash).toBe("");
    expect(location.pathname).toBe("/g");
    expect(sessionStorage.getItem(KEY)).toBe(tok);
  });

  it("uses the stored token after a refresh without a fragment", () => {
    history.replaceState(null, "", `/g#t=${tok}`);
    renderHook(() => useGuardianToken()).unmount();
    const { result } = renderHook(() => useGuardianToken());
    expect(result.current.token).toBe(tok);
  });

  it("forget clears storage and token", () => {
    sessionStorage.setItem(KEY, tok);
    const { result } = renderHook(() => useGuardianToken());
    expect(result.current.token).toBe(tok);
    act(() => result.current.forget());
    expect(result.current.token).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("an invalid fragment clears the hash and never falls back to storage", () => {
    sessionStorage.setItem(KEY, tok);
    history.replaceState(null, "", "/g#t=bad");
    const { result } = renderHook(() => useGuardianToken());
    expect(result.current.token).toBeNull();
    expect(location.hash).toBe("");
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("ignores a malformed stored value", () => {
    sessionStorage.setItem(KEY, "nope");
    const { result } = renderHook(() => useGuardianToken());
    expect(result.current.token).toBeNull();
  });

  describe("hashchange in an open tab", () => {
    const tok2 = "C".repeat(10) + "d-_".repeat(11);
    const fire = (hash: string) =>
      act(() => {
        history.replaceState(null, "", `/g${hash}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });

    it("replaces the token with a new valid one and clears the hash", () => {
      history.replaceState(null, "", `/g#t=${tok}`);
      const { result } = renderHook(() => useGuardianToken());
      fire(`#t=${tok2}`);
      expect(result.current.token).toBe(tok2);
      expect(location.hash).toBe("");
      expect(sessionStorage.getItem(KEY)).toBe(tok2);
    });

    it("a fragment without t clears storage and the token", () => {
      sessionStorage.setItem(KEY, tok);
      const { result } = renderHook(() => useGuardianToken());
      fire("#foo");
      expect(result.current.token).toBeNull();
      expect(location.hash).toBe("");
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("an emptied hash leaves the token alone", () => {
      sessionStorage.setItem(KEY, tok);
      const { result } = renderHook(() => useGuardianToken());
      fire("");
      expect(result.current.token).toBe(tok);
      expect(sessionStorage.getItem(KEY)).toBe(tok);
    });

    it("stops listening after unmount", () => {
      const { result, unmount } = renderHook(() => useGuardianToken());
      unmount();
      fire(`#t=${tok2}`);
      expect(result.current.token).toBeNull();
    });
  });

  it("a valid fragment overwrites a different stored token", () => {
    const other = "E".repeat(43);
    sessionStorage.setItem(KEY, other);
    history.replaceState(null, "", `/g#t=${tok}`);
    const { result } = renderHook(() => useGuardianToken());
    expect(result.current.token).toBe(tok);
    expect(sessionStorage.getItem(KEY)).toBe(tok);
  });
});
