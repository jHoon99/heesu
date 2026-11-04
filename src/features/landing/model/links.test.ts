import { describe, expect, it } from "vitest";
import { telHref } from "./links";

describe("telHref", () => {
  it("builds a tel: link from digits only", () => {
    expect(telHref("063-000-0000")).toBe("tel:0630000000");
    expect(telHref("010-1234-5678")).toBe("tel:01012345678");
  });

  it("returns null for free text, short numbers and null", () => {
    expect(telHref("문의는 카톡")).toBeNull();
    expect(telHref("12")).toBeNull();
    expect(telHref(null)).toBeNull();
  });

  it("never lets a scheme through", () => {
    expect(telHref("javascript:alert(1)")).toBeNull();
  });

  it("requires a leading zero", () => {
    expect(telHref("123-456-7890")).toBeNull();
  });
});
