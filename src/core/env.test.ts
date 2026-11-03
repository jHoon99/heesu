import { describe, expect, it, vi } from "vitest";

// env.ts는 import 시점에 process.env를 검증하므로, import 전에 값을 채워둬요.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
});

import { parseEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
};

describe("parseEnv", () => {
  it("두 값이 있으면 객체를 돌려줘요", () => {
    expect(parseEnv(valid)).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_x",
    });
  });

  it("URL이 없으면 변수 이름을 넣어 throw해요", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("키가 비어 있으면 변수 이름을 넣어 throw해요", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).toThrow(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("URL이 http(s) 형식이 아니면 throw해요", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow();
  });
});
