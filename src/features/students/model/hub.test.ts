import { describe, expect, it } from "vitest";
import { hubHeading, parseHubTab } from "./hub";

describe("parseHubTab", () => {
  it("keeps known tabs and falls back to info", () => {
    expect(parseHubTab("clinic")).toBe("clinic");
    expect(parseHubTab(null)).toBe("info");
    expect(parseHubTab("CLINIC")).toBe("info");
  });
});

describe("hubHeading", () => {
  it("joins school and grade, or shows the grade alone", () => {
    expect(hubHeading("김하늘", "양현고", "고1")).toEqual({
      name: "김하늘",
      meta: "양현고 고1",
    });
    expect(hubHeading("김하늘", "  ", "고1").meta).toBe("고1");
    expect(hubHeading("김하늘", null, "중2").meta).toBe("중2");
  });
});
