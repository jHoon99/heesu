# ConsultForm

랜딩의 상담 신청 폼. 학부모 성함·연락처·학생 학년(필수), 학교, 편한 상담 시간, 궁금한 점, 개인정보 동의(필수).

- `onSubmit(data)`에 `{parent, phone, grade, school, time, message, agree}`가 넘어온다. 성공하면 폼 자리에 접수 완료 화면.
- 검증은 제출할 때 한 번, 고칠 방법을 적은 문구로.
- 폼 바깥은 `Card size="lg" tone="raised"`로 감싼다.
