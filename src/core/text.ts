// 보이지 않는 제어 문자 검사. DB check 제약과 짝을 이루지만 일부러 더 엄격해요:
// multiline이어도 \r와 C1(U+0080~U+009F)을 막아요(DB 정규식은 둘 다 통과시켜요).
const SINGLE_LINE = /[\u0000-\u001f\u007f-\u009f]/;
const MULTILINE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;

export const CONTROL_CHAR_MESSAGE =
  "보이지 않는 특수 문자가 들어 있어요. 지우고 다시 입력해 주세요.";

export function hasControlChars(
  value: string,
  opts?: { multiline?: boolean },
): boolean {
  return (opts?.multiline ? MULTILINE : SINGLE_LINE).test(value);
}
