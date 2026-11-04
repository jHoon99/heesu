# 희수영어 클라우드 배포 런북 (2026-11)

위에서 아래로 그대로 따라 해요. 명령은 코드 블록, 대시보드 조작은 `메뉴 > 메뉴 > 항목: 값`, 단계마다 **확인:** 줄의 기대 결과가 나와야 다음으로 가요. 기대와 다르면 멈추고 §9 되돌리기를 봐요.

- 프로젝트 ref: `pudxtxzcftehxicfthmf` (공개 값이라 문서에 적어도 돼요).
- 이 문서에는 비밀의 **이름**만 있어요. 값은 비밀번호 관리자에만 두고, 명령에 넣는 값은 `read -rs 변수` 로 입력해 변수로 넘겨요.

## 비밀 이름과 놓는 곳

| 이름 | 놓는 곳 | 비고 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Supabase Edge Function 비밀 (`supabase secrets set`) | 시연 중에는 스펙(`docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md` §3)의 Cloudflare 테스트 비밀. 12/1 전 §8에서 진짜 값으로 교체 |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | Supabase가 함수에 자동 주입 | 직접 만들지 않아요. `SUPABASE_` 접두 비밀은 만들 수 없어요 |
| `NEXT_PUBLIC_SUPABASE_URL` | Cloudflare Pages 변수 (Production과 Preview 둘 다) | 브라우저에 가는 공개 값 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cloudflare Pages 변수 (Production과 Preview 둘 다) | 브라우저에 가는 공개 값(`sb_publishable_…`) |
| DB 비밀번호 | `supabase link` 프롬프트에만 입력 | git·셸 기록에 남기지 않아요 |
| 원장 이메일·비밀번호, 학생 임시 비밀번호 | 비밀번호 관리자 | 커밋·SQL 파일에 쓰지 않아요 |

브라우저(Cloudflare 변수)에 가는 값은 위 `NEXT_PUBLIC_…` 둘뿐이에요. `service_role`·`sb_secret_…` 키는 브라우저 코드, git, Cloudflare 어디에도 넣지 않아요(Edge Function 안에서만 써요).

## §0 준비

- [ ] Supabase·GitHub·Cloudflare 계정에 2단계 인증(2FA)을 켜요.
- [ ] GitHub > Settings > Code security: Secret scanning 켬, Push protection 켬.
- [ ] CLI 버전을 확인해요.

  ```bash
  supabase --version
  ```

  **확인:** `2.` 로 시작하는 버전(작성 때 2.121.0)이 나와요. `psql`은 필요 없어요(시드는 SQL Editor로 넣어요).
- [ ] 작업 브랜치를 최신으로 맞춰요.

  ```bash
  git switch dev && git pull
  ```

  **확인:** `Already up to date.` 또는 당겨 온 목록이 나와요.

### 금지 목록 (절대 하지 않아요)

- `supabase config push` — 로컬 `config.toml`의 site_url·인증 설정을 클라우드에 덮어써요. 대시보드 설정은 §3에서 손으로 해요.
- `supabase db push --include-seed` — `supabase/seed.sql`은 로컬 전용 가짜 계정이에요. 클라우드에 올리지 않아요.
- `supabase db reset --linked` — 클라우드 DB를 지워요. `db reset`은 로컬에서만(`--linked` 없이) 써요.
- 대시보드 Table Editor·SQL Editor로 스키마 수정. 스키마는 `supabase/migrations`로만 바꿔요. SQL Editor에서는 `supabase/seed-demo.sql`·`supabase/seed-demo-clear.sql`과 이 문서의 확인 쿼리만 실행해요.
- 커밋별 미리보기 주소(`<hash>.heesu.pages.dev`)에서 로그인. 허용된 주소는 `localhost:3000`, `dev.heesu.pages.dev`, `heesu.pages.dev` 셋뿐이에요.
- `service_role`·`sb_secret_…` 값을 채팅·git·스크린샷에 올리기.

## §1 Supabase 연결과 마이그레이션

- [ ] 로그인하고 프로젝트에 연결해요. DB 비밀번호는 프롬프트에 입력해요.

  ```bash
  supabase login
  supabase link --project-ref pudxtxzcftehxicfthmf
  ```

  **확인:** `Finished supabase link.` 가 나와요.

- [ ] (원격에 진짜 데이터가 이미 있을 때만) 되돌릴 수 있게 데이터만 백업해요. 파일은 저장소 밖에 둬요(비밀·개인정보가 들어 있어요).

  ```bash
  supabase db dump --data-only -f ~/heesu-remote-data-backup.sql
  ```

  **확인:** 파일이 생겨요.

- [ ] 원격에 이미 적용된 마이그레이션을 봐요.

  ```bash
  supabase migration list
  ```

  **확인:** Local 열에 `supabase/migrations`의 파일 18개(`20261104000000` … `20261110000300`)가 보이고, Remote 열에는 이미 적용된 것만 채워져 있어요.
- [ ] 원격에 학생·반 데이터가 이미 있다면 SQL Editor(역할 `postgres`)에서 제어 문자가 든 이름이 없는지 봐요.

  ```sql
  select name from public.students where name ~ '[[:cntrl:]]'
  union all
  select name from public.classes where name ~ '[[:cntrl:]]';
  ```

  **확인:** 0행. 있으면 그 이름을 고친 뒤 진행해요(이름 검사 제약이 마이그레이션에서 걸려요).
- [ ] 대시보드 Database > Extensions: `pg_cron` 켬. 무료(Free) 요금제에서 켜지는지 이 화면에서 직접 확인해요. 켜지지 않으면 멈추고 알려 주세요(retention 마이그레이션 `20261110000100`이 `create extension if not exists pg_cron`을 써서 `db push`가 막혀요). 반드시 `db push` 전에 켜요.
- [ ] 적용될 목록을 미리 봐요.

  ```bash
  supabase db push --dry-run
  ```

  **확인:** 목록이 `supabase/migrations`의 미적용분과 같아요. 처음이면 18개 전부예요.
- [ ] 적용해요.

  ```bash
  supabase db push
  ```

  **확인:** `Finished supabase db push.` 가 나와요.
- [ ] **확인(SQL Editor, 역할 `postgres`):** 아래 네 쿼리를 하나씩 실행해요.

  ```sql
  select extname from pg_extension where extname in ('pg_graphql', 'pg_cron');
  ```

  기대: `pg_cron` 한 행만(`pg_graphql`은 없어요).

  ```sql
  select jobname, schedule from cron.job;
  ```

  기대: `purge-stale-consultations | 0 18 * * *`.

  ```sql
  select id, public, file_size_limit, allowed_mime_types from storage.buckets;
  ```

  기대: `videos | false | 1073741824 | {video/mp4}` (버킷 한도 1GiB — Free에서는 아래 §3 전역 50MB가 먼저 걸려요).

  ```sql
  select count(*) from pg_tables where schemaname = 'public' and not rowsecurity;
  ```

  기대: `0`.

실패했을 때: CLI는 마이그레이션 파일마다 따로 트랜잭션을 써서, 실패한 파일은 되돌려지고 기록되지 않아요. 새 마이그레이션을 더해도 `db push`는 실패한 파일부터 다시 시도하니 도움이 안 돼요. 그래서 원인을 고치고 그대로 다시 `supabase db push` 해요.
- 원인이 환경이면(예: `pg_cron` 미활성) 대시보드에서 고쳐요.
- 원인이 데이터면(예: 제어 문자가 든 이름) SQL Editor에서 그 데이터를 고쳐요.
- 아직 한 번도 적용되지 않은 그 파일 자체가 틀렸다면 PR로 파일을 고쳐요.
- `supabase migration list` 의 Remote 열에 이미 적용된 것으로 나온 파일만 수정하면 안 돼요. 그건 새 마이그레이션으로 앞으로 고쳐요.

## §2 Edge Functions와 비밀

- [ ] 대시보드 Settings > API Keys: legacy 키(anon/service_role)가 **켜져 있는지** 봐요. 함수가 자동 주입되는 `SUPABASE_SERVICE_ROLE_KEY`를 쓰기 때문에, legacy 키를 끄면 함수 3개가 500을 줘요. 끄려면 먼저 코드를 바꿔야 해요(그때까지 켜 둬요). 이미 꺼져 있다면 같은 화면의 Legacy API Keys 탭에서 다시 켜고, 함수를 다시 배포한 뒤 §5 CORS 줄로 함수가 응답하는지 확인해요.
- [ ] Turnstile 비밀을 넣어요. 값은 입력할 때만 화면에 안 보이게 받아요(시연 중 값 = 스펙 §3의 Cloudflare **테스트** 비밀. 이 문서에는 값을 쓰지 않아요).

  ```bash
  read -rs TS_SECRET
  supabase secrets set TURNSTILE_SECRET_KEY="$TS_SECRET"
  unset TS_SECRET
  ```

  빈 값으로 엔터를 치면 빈 비밀이 들어가 함수가 "missing secrets"로 500을 줘요. 그러면 다시 실행해요.

  **확인:** `Finished supabase secrets set.` 가 나오고, `supabase secrets list` 에 `TURNSTILE_SECRET_KEY` 이름이 있어요.
- [ ] 함수 3개를 배포해요. 기본은 Docker가 필요하니 OrbStack을 켜고 `export PATH="$HOME/.orbstack/bin:$PATH"` 를 한 뒤 실행해요. Docker를 쓸 수 없으면 각 명령 끝에 `--use-api` 를 붙여요(서버에서 묶어요). (`supabase/config.toml`에도 `verify_jwt = false`가 3개 있고, 로그인 검사는 함수 안에서 해요).

  ```bash
  supabase functions deploy submit-consultation --no-verify-jwt
  supabase functions deploy create-student --no-verify-jwt
  supabase functions deploy reset-student-password --no-verify-jwt
  ```

  **확인:** 각각 `Deployed Functions on project pudxtxzcftehxicfthmf: …` 가 나와요.
- [ ] **확인:**

  ```bash
  supabase secrets list
  supabase functions list
  ```

  기대: `secrets list`에 `TURNSTILE_SECRET_KEY` 이름(해시된 값)이 있어요. `functions list`에 3개가 모두 `ACTIVE`예요.

## §3 대시보드 설정

각 줄은 위치 · 값 · 왜 순서예요. 바꾼 뒤 저장(Save)을 꼭 눌러요.

- [ ] Authentication > Sign In / Providers > User Signups: Allow new users to sign up **끔** · 학생 계정은 원장만 만들어요.
- [ ] Authentication > Sign In / Providers: Allow anonymous sign-ins **끔** · 익명 계정이 생기면 RLS 가정이 깨져요.
- [ ] Authentication > Sign In / Providers > Email: Email provider **켬**, 같은 Email 설정 안의 Confirm email **켬**, Minimum password length **8** · 원장이 만든 계정은 Auto Confirm으로 만들고 학생 계정은 `create-student` 함수가 확인 처리해요.
- [ ] Authentication > URL Configuration: Site URL `https://heesu.pages.dev`.
- [ ] Authentication > URL Configuration > Redirect URLs: **정확히 3개** `http://localhost:3000`, `https://dev.heesu.pages.dev`, `https://heesu.pages.dev` · 와일드카드(`*`) 금지.
- [ ] Authentication > Multi-Factor: TOTP **켬** · 원장 2단계 인증용.
- [ ] Authentication > Sessions (또는 Attack Protection): refresh token rotation **켬**, reuse interval **10초**.
- [ ] Realtime > Settings: Allow public access **끔** · 비로그인 구독을 막아요.
- [ ] Database > Extensions: `pg_cron` **켜짐**(§1에서 켠 것) · 상담 보관 기한 삭제 작업이 돌아요.
- [ ] Storage > Settings: 전역 파일 크기 한도 **50MB**(Free 최대) · 시연 영상은 짧게 찍어요. Storage > Buckets > `videos`: Public **꺼짐**(private), 허용 형식 `video/mp4`.
- [ ] Organization > Usage: 사용량 알림을 받을 메일 주소를 확인해요. 시연 주간에는 매일 Usage를 확인해요(`guardian_view` 반복 호출은 DB가 막지 않아요).

**확인(바꾼 뒤 셸에서, `$API`·`$PK`는 §5 맨 위와 같아요):**

```bash
curl -s -X POST $API/auth/v1/signup -H "apikey: $PK" -H 'content-type: application/json' -d '{}'
```

기대: 익명 로그인이 꺼져 있다는 오류(`anonymous_provider_disabled` 등)가 와요. 사용자가 만들어지면(access_token이 오면) 바로 Authentication > Users에서 지우고 설정을 다시 확인해요.
- Redirect URLs: 화면에 위 3개만 보이고 `*` 가 없어요.
- Realtime > Settings: Allow public access 가 꺼져 있어요.
- Authentication > Users에 `probe@…` 같은 낯선 사용자가 없어요. §5의 `signup_disabled` 스모크와 §1의 버킷 쿼리도 이 설정을 증명해요.

## §4 Cloudflare Pages

- [ ] Workers & Pages > heesu > Settings > Build: Production branch `main`, Build command `npm run build`, Build output directory `out`.
- [ ] Settings > Variables and Secrets: `NODE_VERSION = 22` (Production·Preview 둘 다).
- [ ] Settings > Build > Branch control: 자동 미리보기 브랜치는 `dev`만(Custom branches) · 커밋별 주소에서 로그인하지 않게 해요.
- [ ] Settings > Variables and Secrets: **Production과 Preview 둘 다**에 아래 둘을 넣어요. 이 둘 외의 값은 넣지 않아요.
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://pudxtxzcftehxicfthmf.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = 대시보드 Settings > API Keys의 `sb_publishable_…` 값(공개 값이지만 문서에는 이름만 써요)
- [ ] 변수는 빌드 때 코드에 박혀요. 바꾼 뒤에는 Deployments > 최신 `dev` 배포 > Retry deployment 를 눌러요.

**확인:** Deployments에서 `dev` 배포가 Success이고 `https://dev.heesu.pages.dev` 가 열려요.

## §5 배포 뒤 확인(스모크)

```bash
H=https://dev.heesu.pages.dev        # 운영 확인 때는 https://heesu.pages.dev
API=https://pudxtxzcftehxicfthmf.supabase.co
read -r PK                            # publishable 키(공개 값)를 붙여 넣어요
```

- [ ] 학부모 페이지 헤더:

  ```bash
  curl -sI $H/g | grep -iE 'referrer-policy|x-robots-tag'
  ```

  **확인:** `referrer-policy: no-referrer` **한 줄만**(strict-origin-when-cross-origin이 같이 나오면 실패), `x-robots-tag: noindex`.
- [ ] CSP와 보안 헤더:

  ```bash
  curl -sI $H/ | grep -iE 'content-security-policy|strict-transport-security|x-content-type-options'
  ```

  **확인:** CSP에 `pudxtxzcftehxicfthmf.supabase.co`, `worker-src 'self'`, `manifest-src 'self'`, `frame-src https://challenges.cloudflare.com` 가 있고, 같은 응답에 `strict-transport-security`, `x-content-type-options: nosniff` 가 있어요.
- [ ] 서비스 워커:

  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' $H/s
  curl -sI $H/sw.js | grep -i cache-control
  ```

  **확인:** `200`(3xx면 서비스 워커가 리다이렉트 응답을 저장해요 — 멈추고 알려 주세요), `cache-control: no-cache`.
- [ ] CORS — 허용 목록(`supabase/functions/_shared/http.ts` `ALLOWED_ORIGINS`)의 주소에서만 통과해요.

  ```bash
  curl -si -X OPTIONS $API/functions/v1/submit-consultation \
    -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' | head -1
  curl -si -X OPTIONS $API/functions/v1/submit-consultation \
    -H "Origin: $H" -H 'Access-Control-Request-Method: POST' | grep -iE '^HTTP|access-control-allow-origin'
  curl -si -X POST $API/functions/v1/submit-consultation \
    -H 'Origin: https://evil.example' -H 'content-type: application/json' -d '{}' | head -1
  ```

  **확인:** 첫째 `403`이고 응답에 `access-control-allow-origin`이 없어요. 둘째 2xx이고 `access-control-allow-origin: https://dev.heesu.pages.dev`(= `$H`)예요. 셋째 `403`. (로컬 게이트웨이는 OPTIONS에 `*`를 줬어요. 클라우드 게이트웨이가 어떻게 주는지 여기서 확인해요. `*`가 나오면 알려 주세요.)
- [ ] 가입 차단:

  ```bash
  curl -s -X POST $API/auth/v1/signup -H "apikey: $PK" -H 'content-type: application/json' \
    -d '{"email":"probe@example.test","password":"probe-pass-1234"}'
  ```

  **확인:** `signup_disabled` 오류가 와요.
- [ ] 비로그인(anon) 읽기:

  ```bash
  curl -s "$API/rest/v1/students?select=id" -H "apikey: $PK"
  curl -s "$API/rest/v1/site_content?select=key" -H "apikey: $PK"
  curl -s "$API/rest/v1/rpc/guardian_view?p_token=x" -H "apikey: $PK"
  ```

  **확인:** 첫째 `[]` 또는 권한 오류(학생 데이터가 안 보여요). 둘째 첫 배포(§6 시드 전)에는 HTTP 200과 `[]` 예요(마이그레이션이 행을 넣지 않아요. 비로그인 읽기 권한이 동작한다는 뜻이에요). §6 시드 뒤나 §7에서 다시 하면 6개 키(`notice`, `classes`, `tuition`, `contact`, `legal`, `points_goal`)가 와요. 셋째 오류(GET은 거절돼요).
- [ ] **상담 신청 스모크 테스트**(§6에서 원장 로그인이 된 뒤에 해요): `$H`에서 폼을 제출해요. 이름은 `(예시) 확인용`, 전화는 `010-0000-0099`처럼 가짜로 써요. **확인:** 성공 카드가 뜨고 → 원장 상담 목록에 보이고 → 상태를 `보류` 처리해요. 이 행은 `seed-demo-clear.sql` 이 지우지 않으니(시드 상담 0081·0082만 지워요) 확인 뒤 SQL Editor에서 지워요: `delete from public.consultations where phone = '010-0000-0099';` **확인:** `1 row` 삭제.
- [ ] 테스트 계정이 남지 않았는지 SQL Editor에서 확인해요.

  ```sql
  select count(*) from auth.users where email like '%@example.test';
  select count(*) from private.admins a join auth.users u on u.id = a.user_id where u.email like '%@example.test';
  ```

  **확인:** 둘 다 `0`. 가입 차단 전에 `probe@example.test`가 만들어졌다면 Authentication > Users에서 지워요.

## §6 원장 계정과 시연 데이터

- [ ] Authentication > Users > Add user > Create new user: `<원장 이메일>`, 비밀번호 **12자 이상**(비밀번호 관리자에 저장), Auto Confirm 켬.
- [ ] SQL Editor(역할 `postgres`)에서 원장 권한을 줘요. 실행 뒤 편집기에서 지우고 저장된 쿼리로 남기지 않아요(`<원장 이메일>`은 커밋하지 않아요).

  ```sql
  insert into private.admins (user_id)
  select id from auth.users where email = '<원장 이메일>'
  returning user_id;
  ```

  SQL Editor는 0행이 들어가도 "No rows returned"만 보여 주니, 반드시 반환된 행으로 확인해요.

  **확인:** 정확히 1행(uuid)이 반환돼요. 이어서 실행해요: `select count(*) from private.admins a join auth.users u on u.id = a.user_id where u.email = '<원장 이메일>';` 기대 `1`. 0행이면 이메일 철자를 확인하고 다시 해요.
- [ ] `$H/login` 에서 로그인해요 → TOTP 등록(준비용으로 내 인증 앱에) → QR이 CSP 아래에서 보이는지 확인해요.
- [ ] `$H/admin` 학생 추가를 두 번 해요. 아이디 `demo_haneul`(학년 중2), `demo_minjun`(학년 고1), 이름은 아무거나(시드가 바꿔요). 임시 비밀번호는 비밀번호 관리자에만 적어요. **확인:** 학생 목록에 둘이 보여요.
- [ ] 시드 넣기. SQL Editor에서 역할이 **postgres** 인지 확인하고, `supabase/seed-demo.sql` **파일 전체**를 붙여 넣고 **Run을 한 번만** 눌러요. 일부만 선택해서 실행하지 않아요(한 트랜잭션이라 실패하면 아무것도 남지 않아요. 문장별로 따로 실행하면 파일의 가드가 막아요).

  **확인:**

  ```sql
  select count(*) from public.students where login_id like 'demo\_%';
  ```

  기대 `8`. 오류가 나면 문구대로 고치고(예: "시연 데이터가 이미 들어 있어요" → 먼저 `supabase/seed-demo-clear.sql`), 같은 쿼리가 `2`(원장 화면으로 만든 둘)인지 확인한 뒤 다시 실행해요.
- [ ] `$H/admin` 영상: 두 반에 짧은 mp4를 하나씩 올려요(각 50MB 미만, 직접 찍어 저작권 문제 없는 클립). **확인:** 영상 목록에 두 개가 보여요.
- [ ] §5의 상담 신청 스모크 테스트를 지금 해요(원장 목록 확인과 가짜 행 삭제까지).
- [ ] `demo_haneul` 상세 > 학부모 링크 만들기 → 시연 때 누나 폰으로 열어 봐요(링크는 `/g#t=…` 형태이고 URL 조각에만 토큰이 들어가요).
- [ ] **시연 전날 밤 (1)** QA가 시연 상태를 써 버려요(+3 축하, 수업 시작, 첫 로그인 비밀번호 변경, 숙제 제출, 답변). 시연 전날 밤에 SQL Editor(역할 `postgres`)로 `supabase/seed-demo-clear.sql` **전체**를 한 번 Run → 이어서 `supabase/seed-demo.sql` **전체**를 한 번 Run 해요(날짜가 모두 그날 서울 날짜 기준이라 빈 날이 없어요).
  - 첫 로그인 비밀번호 변경 화면은 계정마다 **한 번만** 보여 줄 수 있어요. 시연에서 보여 주려면 QA에서 쓰지 말고 아껴 두거나, `demo_haneul`·`demo_minjun`의 비밀번호를 학생 상세의 "비밀번호 초기화"로 다시 만들어 임시 비밀번호 상태로 되돌려요.
  - 지우기·다시 넣기는 두 학생 행과 로그인 계정은 남겨 두므로 학생을 다시 만들 필요가 없어요. 학부모 링크는 지워지니 `demo_haneul` 상세에서 다시 만들어요.
  - **영상은 사라져요.** clear가 시연 반을 지우면 영상도 같이 지워지고 시드는 영상을 넣지 않아요. 위 "영상:" 단계대로 두 반에 짧은 mp4를 다시 올려요.
  - **랜딩 관리 편집은 되돌아오지 않아요.** QA에서 바꾼 공지·반·수강료·연락처·법정 표시는 원래 값으로 손으로 되돌리고, 보상 목표는 반드시 30으로 해요(그래야 +3 축하 시연이 돼요).
  - QA용 학생(`qa_test1`)과 QA용 반이 시연 반에 남아 있으면 clear가 "시연 반에 실제 학생이 배정돼 있어요. 그 학생을 다른 반으로 먼저 옮긴 뒤 다시 실행해 주세요."라고 멈춰요. 먼저 시연 반에서 빼거나 지워요.
  - **확인:** 위 `demo\_%` 쿼리가 `8`.
- [ ] **시연 전날 밤 (2)** 준비용 TOTP를 지워 누나가 첫 로그인 때 자기 폰으로 등록하게 해요.

  ```sql
  delete from auth.mfa_factors where user_id = (select id from auth.users where email = '<원장 이메일>');
  ```

  **확인:** 원장으로 로그인하면 TOTP 등록 화면이 떠요. 한 번 확인하고 등록하지 않은 채 로그아웃해요.

## §7 운영 배포 (`dev` → `main`)

- [ ] GitHub에서 PR `dev → main` 을 만들고 **Create a merge commit** 으로 합쳐요(squash 금지 — dev와 main 역사를 맞춰요).
- [ ] CI 통과를 기다려요. **확인:** 모든 체크가 초록이에요.
- [ ] 머지하면 Cloudflare가 프로덕션을 빌드해요. **확인:** Deployments에서 `main` 배포가 Success예요.
- [ ] §5를 `H=https://heesu.pages.dev` 로 다시 해요. **확인:** §5 기대값과 같아요.

## §8 공개 전 관문 (시연과 별개 — 12/1 또는 주소를 공개로 나누기 전에 모두 끝내요)

- [ ] 예시 문구가 남아 있지 않은지 봐요. SQL Editor에서:

  ```sql
  select key from public.site_content where value::text like '%(예시)%';
  ```

  **확인:** 0행. 행이 나오면 원장 화면에서 그 문구를 실제 내용으로 고쳐요.
- [ ] 원장 화면에서 `contact.phone` 을 실제 번호로 바꿔요. 형식은 `0XX-XXX(X)-XXXX`(예: `063-123-4567`). 1588·070 번호는 아직 받지 않아요. 시드의 가짜 번호는 `063-000-0000` 이에요. **확인:** 랜딩 하단 연락처가 실제 번호예요.
- [ ] 진짜 Turnstile 키로 바꿔요. 순서가 중요해요. 비밀을 먼저 바꾸면 사이트 키가 아직 테스트용인 동안 모든 신청이 실패해요.
  - Cloudflare > Turnstile > 위젯 만들기: 허용 호스트 `heesu.pages.dev`, `dev.heesu.pages.dev`.
  - 1) 사이트 키(공개 값)는 `src/features/consultations/model/consultation.ts` 의 `TURNSTILE_SITE_KEY` 를 PR로 교체하고 §7 운영 배포까지 마쳐요. (함수가 응답의 hostname을 검사하는 코드는 후속 항목이에요: `docs/superpowers/plans/v1-followups.md`)
  - 2) 그 운영 배포가 끝난 **뒤에만** 비밀 키를 바꿔요. `read -rs TS_SECRET` 으로 받아 `supabase secrets set TURNSTILE_SECRET_KEY="$TS_SECRET"` 로 교체하고 `unset TS_SECRET` 해요(§2와 같은 방법).
  - 3) 함수를 재배포해요: `supabase functions deploy submit-consultation --no-verify-jwt`.
  - **확인:** `$H`에서 실제 신청 1건이 성공하고, 테스트 비밀을 쓰던 때와 달리 Turnstile 위젯이 실제로 검증해요.
- [ ] 시연 데이터를 지워요(공개 전 필수). SQL Editor(역할 `postgres`)에서 `supabase/seed-demo-clear.sql` 전체를 Run → 원장 화면에서 `demo_haneul`·`demo_minjun` 을 지우거나 퇴원 처리 → Authentication > Users에서 `demo_haneul@student.heesu.internal`, `demo_minjun@student.heesu.internal` 사용자를 지우고 Storage `videos` 의 시연 영상 파일도 지워요. **확인:** `select count(*) from public.students where login_id like 'demo\_%';` 가 `0`(퇴원 처리만 했다면 원장 화면에서 목록에 안 보여요).
- [ ] 랜딩과 `/privacy`에 빈칸 자리표시가 남아 있지 않아요. 푸터의 "대표"와 "사업자등록번호"는 코드에 비어 있는 값으로 박혀 있어 랜딩 관리로 못 채워요 — 코드 수정 PR이 필요해요. **확인:** 두 곳을 눈으로 훑어 빈칸 자리표시(회색 칸)가 없어요.
- [ ] `/privacy` 관문: 빈칸 채움 · 없는 기능 문구 제거 · 법률 검토 → `src/app/(landing)/privacy/page.tsx` 의 `robots: { index: false, … }` 를 제거하고 `public/sitemap.xml` 에 `/privacy` 를 다시 넣어요(`src/test/seo.test.ts` 가 이 상태를 고정하고 있어 같이 고쳐요). **확인:** 배포 후 `curl -s $H/privacy | grep -i noindex` 가 비어 있어요.

## §9 되돌리기

- **프론트:** Cloudflare > Deployments > 이전 프로덕션 배포 > Rollback to this deployment (빌드 없이 즉시).
- **함수:** 이전 커밋으로 옮겨 다시 배포하고 돌아와요.

  ```bash
  git switch --detach <이전 커밋>
  supabase functions deploy <이름> --no-verify-jwt
  git switch -
  ```
- **DB:** 되돌리는(down) 마이그레이션은 없어요. 앞으로 고치는 **새** 마이그레이션만 써요(fix forward). 프론트를 되돌릴 때는 되돌아갈 빌드가 지금 적용된 마이그레이션과 맞는지 먼저 봐요. 예를 들어 `site_content` 의 insert/update/delete 권한이 회수된(`20261110000200`) 뒤라면 그 전 빌드의 화면은 저장에 실패할 수 있어요.
- **첫 운영 배포:** 되돌아갈 이전 배포가 없어요. 그리고 Rollback은 프로덕션 배포에만 쓸 수 있어요(미리보기 배포는 안 돼요). 문제가 있으면 고친 커밋을 다시 올려요.
- **백업:** Free에는 자동 백업이 없어요. 원격에 진짜 데이터가 있으면 §1의 `supabase db dump --data-only -f <저장소 밖 경로>` 파일을 보관해요.
- **시연 데이터:** 시연 데이터가 꼬이면 `supabase/seed-demo-clear.sql` → 다시 `supabase/seed-demo.sql`(각각 SQL Editor, 역할 postgres, 파일 전체, Run 한 번).
- **비밀:** `supabase secrets unset <이름>`.
- **최후 수단(새 프로젝트):** ref가 바뀌어 `public/_headers`의 CSP, `src/test/headers.test.ts`, Cloudflare 변수, Turnstile 설정을 같이 바꿔야 해요. 시연 전에는 하지 않아요.
- **계정 문제:** 학생 추가 중 끊겨 로그인만 되는 Auth 사용자(`students` 행 없음)가 남으면 그 아이디를 다시 못 써요. Authentication > Users에서 `<아이디>@student.heesu.internal` 을 지워요.
