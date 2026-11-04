# StudentTabBar

학생 웹앱 하단 탭바(64px + safe-area). 기본 탭: 홈 · 숙제 · 강의 · 랭킹 · 내 정보. 5개를 넘기지 않는다.

- `active`, `onNavigate`, `items: {value,label,icon,dot?}[]`. `dot`은 새 숙제·새 영상 표시(빨간 점).
- 홈 화면에 추가한 웹앱이므로 `padding-bottom: env(safe-area-inset-bottom)`이 들어 있다.
