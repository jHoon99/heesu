import { describe, expect, it } from "vitest";
import { classifyError } from "./error";

const UNKNOWN = "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
const INVALID = "입력한 내용을 다시 확인해 주세요.";

describe("classifyError", () => {
  it.each([
    [{ code: "PGRST116" }, "notFound", "이미 삭제되었거나 찾을 수 없어요."],
    [{ code: "42501" }, "forbidden", "접근 권한이 없어요."],
    [{ code: "23505" }, "conflict", "이미 처리된 요청이에요."],
    [{ code: "23514" }, "invalid", INVALID],
    [{ code: "22001" }, "invalid", INVALID],
    [new TypeError("Failed to fetch"), "network", "네트워크 상태를 확인해 주세요."],
    [new TypeError("Load failed"), "network", "네트워크 상태를 확인해 주세요."],
    [{ name: "FunctionsFetchError", message: "x" }, "network", "네트워크 상태를 확인해 주세요."],
    [{ status: 503 }, "server", "잠시 후 다시 시도해 주세요."],
    [{ status: "500" }, "server", "잠시 후 다시 시도해 주세요."],
    [{ statusCode: 502 }, "server", "잠시 후 다시 시도해 주세요."],
    [{ status: 401 }, "forbidden", "접근 권한이 없어요."],
    [{ status: 403 }, "forbidden", "접근 권한이 없어요."],
    [{ status: 404 }, "notFound", "이미 삭제되었거나 찾을 수 없어요."],
    [{ status: 409 }, "conflict", "이미 처리된 요청이에요."],
    [{ code: "23505", status: 500 }, "conflict", "이미 처리된 요청이에요."],
    [null, "unknown", UNKNOWN],
    [undefined, "unknown", UNKNOWN],
    ["x", "unknown", UNKNOWN],
    [new Error("x"), "unknown", UNKNOWN],
    [{}, "unknown", UNKNOWN],
  ])("%j -> %s", (input, kind, message) => {
    expect(classifyError(input)).toEqual({ kind, message });
  });
});
