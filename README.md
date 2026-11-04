# 희수영어

학원 소개·상담 신청 랜딩과 학생·원장 화면을 담은 Next.js(정적 내보내기) + Supabase 프로젝트예요.

## 로컬 실행

OrbStack(또는 Docker)과 Supabase CLI가 필요해요.

```bash
export PATH="$HOME/.orbstack/bin:$PATH"
supabase start
cp .env.example .env.local
```

`.env.local`의 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에는 `supabase status`에 나오는 publishable 키를, `NEXT_PUBLIC_SUPABASE_URL`에는 API URL(기본 `http://127.0.0.1:56321`)을 넣어요. 이 파일은 git에 올라가지 않아요.
Edge Function 비밀은 `supabase/functions/.env`(git 제외, 예시는 `supabase/functions/.env.example`)에 둬요.

```bash
npm ci
npm run dev
```

개발 서버는 반드시 `http://localhost:3000` 에서 돌려요. Edge Function의 Origin 허용 목록이 이 주소를 기준으로 해요.

## 검증

```bash
npm run typecheck && npm run lint && npm test && npm run db:test && npm run build
npm run fn:check       # Edge Function 타입 검사와 테스트(Deno)
npm run db:demo-check  # 시연 시드의 넣기·거절·지우기·다시 넣기를 로컬 DB에서 해 보고 rollback
```

## 문서

- 설계: `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md`, `docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md`
- 계획: `docs/superpowers/plans/`
- 클라우드 배포 런북: `docs/deploy/2026-11-cloud-runbook.md`
- QA 체크리스트: `docs/qa/` (계획 7에서 추가)
