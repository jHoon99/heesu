# VideoCard

영상 강의 하나. 썸네일 이미지가 없을 때도 브랜드 톤 자리표시(명조 Unit 표기 + 재생 버튼)로 보인다.

- `title`, `subtitle`(분류), `unit`, `duration`, `progress`(0–100; 100이면 "다 봤어요"), `isNew`.
- `layout`: 기본 세로(새 영상 1개 크게), `"row"`(목록).
- 실제 썸네일을 쓸 땐 `.hs-video__thumb` 안에 `<img>`를 넣고 장식 원은 끈다.
