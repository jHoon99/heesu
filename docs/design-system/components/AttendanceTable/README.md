# AttendanceTable

원장이 학생×날짜 표에서 출결·숙제를 클릭으로 빠르게 체크하는 표. 날짜마다 출결 칸과 숙제 칸이 하나씩 있고, 칸을 누를 때마다 다음 상태로 바뀐다.

- 출결 순환: 미입력 → 출석 → 지각 → 결석 → 보강 → 미입력. 숙제: 미입력 → 완료 → 미완료 → 미입력.
- props: `students: {id,name,meta?}[]`, `dates: {key,label,day,today?}[]`, `records`(제어) 또는 `defaultRecords`, `onChange(studentId, dateKey, "att"|"hw", value)`, `showHomework`(기본 true), `maxHeight`(넘치면 표 안에서 스크롤; 머리행·이름 열 고정).
- 오늘 열은 `brown-100` 머리와 옅은 배경으로 표시.
- 마지막 열: 출석 수/입력 수 · 숙제 완료율. 60% 미만은 `danger-700` 굵게.
- 저장은 칸마다 즉시 → `Toast`(되돌리기)로 알린다. 별도 "저장" 버튼을 두지 않는다.
- 아래에 `AttendanceTable.Legend`로 범례를 둔다.
