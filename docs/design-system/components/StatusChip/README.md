# StatusChip

출결·숙제 상태를 색 + 아이콘 + 글자로 보여 주는 칩. `status`: `present` 출석 · `late` 지각 · `absent` 결석 · `makeup` 보강 · `done` 완료 · `missing` 미완료 · `none` 미입력.

- 표 안에서는 `size="sm"`(24px, 모서리 4px).
- `onClick`을 주면 버튼이 된다(출결 표에서 클릭해 상태 순환). 이때 `ariaLabel`에 "학생 이름 날짜 상태" 전체를 적는다.
- `label`로 글자만 바꿀 수 있다("숙제 완료"). 상태 이름 자체는 바꾸지 않는다.
- 갈색·꿀색은 상태 색으로 쓰지 않는다.
