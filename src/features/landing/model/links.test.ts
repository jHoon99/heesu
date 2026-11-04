import { describe, expect, it } from "vitest";
import { naverMapHref, telHref } from "./links";

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

describe("naverMapHref", () => {
  it("encodes the address into the search url", () => {
    expect(naverMapHref("전북 전주시 완산구 1")).toBe(
      "https://map.naver.com/p/search/%EC%A0%84%EB%B6%81%20%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EC%99%84%EC%82%B0%EA%B5%AC%201",
    );
  });

  it("encodes markup characters", () => {
    expect(naverMapHref("<script>alert(1)</script>")).toBe(
      "https://map.naver.com/p/search/%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    );
  });

  it("returns null without an address", () => {
    expect(naverMapHref(null)).toBeNull();
    expect(naverMapHref("")).toBeNull();
  });
});
