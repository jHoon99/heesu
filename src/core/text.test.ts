import { describe, expect, it } from "vitest";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "./text";

// DB 검사(sessions의 정규식)보다 일부러 더 엄격해요: multiline에서도 \r와 C1(U+0080~U+009F)을 막아요.
describe("hasControlChars", () => {
  it("보통 이름은 false예요", () => {
    expect(hasControlChars("김하늘")).toBe(false);
  });

  it("C0 제어 문자(BEL)는 true예요", () => {
    expect(hasControlChars("김\u0007")).toBe(true);
  });

  it("줄바꿈은 한 줄 값에서 true, multiline에서 false예요", () => {
    expect(hasControlChars("줄1\n줄2")).toBe(true);
    expect(hasControlChars("줄1\n줄2", { multiline: true })).toBe(false);
  });

  it("탭도 multiline에서만 허용해요", () => {
    expect(hasControlChars("a\tb")).toBe(true);
    expect(hasControlChars("a\tb", { multiline: true })).toBe(false);
  });

  it("\\r는 multiline에서도 true예요", () => {
    expect(hasControlChars("\r", { multiline: true })).toBe(true);
  });

  it("DEL과 C1(U+0085)은 true예요", () => {
    expect(hasControlChars("a\u007f")).toBe(true);
    expect(hasControlChars("\u0085")).toBe(true);
    expect(hasControlChars("\u0085", { multiline: true })).toBe(true);
  });

  it("문구는 고치는 방법까지 알려 줘요", () => {
    expect(CONTROL_CHAR_MESSAGE).toBe(
      "보이지 않는 특수 문자가 들어 있어요. 지우고 다시 입력해 주세요.",
    );
  });
});
