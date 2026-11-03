# Button

화면에서 하는 일을 실행하는 버튼. `variant`: `primary`(한 화면에 하나 — "상담 신청하기", "저장"), `secondary`(갈색 테두리, 보조 행동), `ghost`(툴바·표 위 작은 행동), `danger`(삭제 등 되돌릴 수 없는 행동, 반드시 Modal로 확인).

- `size`: 모바일은 `lg`(48px), 관리 화면은 `md`(40) 또는 `sm`(32).
- `icon` / `iconRight`에 `Icon` 이름. 아이콘만 있는 버튼은 `aria-label` 필수.
- `block`으로 가로 꽉 채움(모바일 폼 제출).
- 글자는 동사로 끝낸다. "확인"보다 "결석 처리".
