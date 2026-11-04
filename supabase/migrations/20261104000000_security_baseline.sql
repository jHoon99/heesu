-- 보안 기본값 (설계 13장 S1·S2·S5·S12). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/00_meta.test.sql, 01_auth_lockdown.test.sql

-- ─── S2. 기본 권한 회수 ───────────────────────────────────────────────
-- Supabase는 public에 새로 만드는 객체를 anon·authenticated에 자동 grant한다.
-- 이를 끊고, 필요한 권한은 각 마이그레이션이 명시적으로 grant한다.
-- 대상 역할은 postgres(로컬·클라우드에서 마이그레이션을 실행하는 역할)다.
-- supabase_admin은 postgres가 그 역할의 멤버가 아니라서 바꿀 수 없다
-- ("permission denied to change default privileges"). 그 역할이 public에 만드는
-- 객체(확장 등)는 메타 테스트가 잡아낸다.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
-- 함수의 PUBLIC EXECUTE는 내장 전역 기본값이라 스키마 단위 revoke로는 지울 수 없다.
-- 그래서 전역(in schema 없이)으로 회수한다. postgres가 어느 스키마에 만드는 함수든 해당한다.
alter default privileges for role postgres
  revoke execute on functions from public;

-- 이미 있는 객체도 회수한다.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- 쓰지 않는 GraphQL 엔드포인트를 끈다.
drop extension if exists pg_graphql;

-- ─── private 스키마: API에 노출하지 않는 내부 객체 ─────────────────────
-- config.toml [api] schemas에 없으므로 PostgREST로 노출되지 않는다.
-- authenticated는 RLS 정책에서 private.is_admin() 등을 부르기 위해 usage만 갖는다.
-- anon에는 usage도 주지 않는다. private 테이블에는 누구에게도 grant하지 않는다.
create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ─── S1·S5. 원장 판정 ────────────────────────────────────────────────
-- 역할은 클라이언트가 쓸 수 없는 이 테이블로만 판단한다 (user_metadata 금지).
create table private.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now()
);
alter table private.admins enable row level security;

-- 원장 = admins에 있고 MFA(aal2)를 거친 세션.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = auth.uid())
     and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- ─── S12. 감사 로그 ─────────────────────────────────────────────────
-- append-only: anon·authenticated에 어떤 권한도 없고, 쓰기는 private.audit() 트리거로만.
create table private.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text not null,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE'))
);
alter table private.audit_log enable row level security;

-- 사용법(나중 테이블): `id` 컬럼이 있는 테이블에
--   create trigger <t>_audit after insert or update or delete on public.<t>
--     for each row execute function private.audit();
create function private.audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.audit_log (actor, table_name, row_id, op)
  values (
    auth.uid(),
    tg_table_schema || '.' || tg_table_name,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'id',
    tg_op
  );
  return null;
end;
$$;
revoke all on function private.audit() from public, anon, authenticated;
