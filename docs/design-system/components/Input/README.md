# Input

라벨이 붙은 한 줄 입력창(`multiline`이면 여러 줄). 라벨은 항상 위에 보이게 — placeholder를 라벨 대신 쓰지 않는다.

- `label`, `required`(빨간 *), `hint`(도움말), `error`(빨간 문구 + 테두리; hint를 대신함).
- 모바일 기본 48px·16px 글자(iOS 확대 방지). 관리 화면은 `size="md"`.
- 나머지 props는 `<input>`에 그대로 전달(`type="tel"`, `inputMode`, `autoComplete`).
