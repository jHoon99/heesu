-- 메타 테스트: 보안 기본값(설계 13장 S2)이 어긋나면 실패한다.
--
-- 함수 허용 목록 규칙: 스키마별로 `proname`(스키마 없는 함수 이름)만 담은
-- 정렬·중복 제거된 text[]로 비교한다. 새 함수를 anon/authenticated에 열 때는
-- 아래 해당 스키마의 허용 목록에 이름을 알파벳 순으로 추가한다.
-- (예: guardian_view 추가 시 anon public 목록을 '{guardian_view}'::text[]로)
-- `submit_consultation`은 service_role 전용이라 anon·authenticated 목록에 들어가지 않는다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- S2: public의 모든 테이블은 RLS가 켜져 있고, RLS를 걸 수 없는 foreign table은 없다.
select is(
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and ((c.relkind in ('r', 'p') and not c.relrowsecurity)
           or c.relkind = 'f')),
  0,
  'public: RLS가 꺼진 테이블·foreign table이 없다'
);

-- S2: anon이 실행할 수 있는 public 함수 = 허용 목록.
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'execute')),
  '{}'::text[],
  'public: anon이 실행할 수 있는 함수 = 허용 목록'
);

-- S2: authenticated가 실행할 수 있는 public 함수 = 허용 목록.
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('authenticated', p.oid, 'execute')),
  '{}'::text[],
  'public: authenticated가 실행할 수 있는 함수 = 허용 목록'
);

-- S2: authenticated가 실행할 수 있는 private 함수 = 허용 목록 (RLS 정책용 헬퍼만).
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('authenticated', p.oid, 'execute')),
  '{is_admin}'::text[],
  'private: authenticated가 실행할 수 있는 함수 = 허용 목록'
);

-- S2: postgres 소유 security definer 함수는 (시스템 스키마 제외) 모두 search_path = ''를 고정한다.
select is(
  (select coalesce(array_agg(n.nspname || '.' || p.proname order by 1), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and pg_get_userbyid(p.proowner) = 'postgres'
      and p.prosecdef
      and not ('search_path=""' = any(coalesce(p.proconfig, '{}')))),
  '{}'::text[],
  'postgres 소유 security definer 함수는 모두 search_path = '''' 설정이 있다'
);

-- S2: public에 materialized view 금지.
select is(
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'm'),
  0,
  'public: materialized view가 없다'
);

-- S2: public의 view는 모두 security_invoker.
select is(
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and not exists (
        select 1 from unnest(coalesce(c.reloptions, '{}')) o
         where o ~* '^security_invoker=(true|on|yes|1)$')),
  0,
  'public: security_invoker가 아닌 view가 없다'
);

-- S2: anon은 private 스키마에 접근할 수 없다.
select is(
  has_schema_privilege('anon', 'private', 'usage'),
  false,
  'anon은 private 스키마 usage가 없다'
);

-- S2·S12: anon·authenticated는 private의 어떤 테이블·view·시퀀스에도 권한이 없다.
-- (information_schema는 현재 역할이 관여한 grant만 보여주므로 has_*_privilege로 직접 확인한다.)
select is(
  (select coalesce(array_agg(r.rolname || ':' || c.relname order by 1), '{}')
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) as r(rolname)
    where n.nspname = 'private'
      and (
        (c.relkind in ('r', 'p', 'v', 'm', 'f') and (
           has_table_privilege(r.rolname, c.oid, 'select, insert, update, delete, truncate, references, trigger')
           or has_any_column_privilege(r.rolname, c.oid, 'select, insert, update, references')))
        or (c.relkind = 'S' and has_sequence_privilege(r.rolname, c.oid, 'usage, select, update')))),
  '{}'::text[],
  'private: anon·authenticated 권한이 있는 테이블이 없다'
);

-- S2: 쓰지 않는 pg_graphql은 꺼져 있다.
select hasnt_extension('pg_graphql', 'pg_graphql 확장이 없다');

-- S2: 기본 권한 회수 — 이 마이그레이션 역할(postgres)이 새로 만드는 public 객체는
-- anon·authenticated에 아무 권한도 갖지 않는다. (트랜잭션 안에서 만들고 rollback한다.)
create table public.__meta_probe (id int);
create function public.__meta_probe_fn() returns int language sql as 'select 1';

select is(
  (select coalesce(array_agg(r.rolname order by 1), '{}')
     from (values ('anon'), ('authenticated')) as r(rolname)
    where has_table_privilege(r.rolname, 'public.__meta_probe',
            'select, insert, update, delete, truncate, references, trigger')),
  '{}'::text[],
  '기본 권한: 새 public 테이블에 anon·authenticated 권한이 없다'
);

-- (PUBLIC에 남은 EXECUTE도 anon·authenticated 검사에 걸린다.)
select is(
  (select coalesce(array_agg(r.rolname order by 1), '{}')
     from (values ('anon'), ('authenticated')) as r(rolname)
    where has_function_privilege(r.rolname, 'public.__meta_probe_fn()', 'execute')),
  '{}'::text[],
  '기본 권한: 새 public 함수에 anon·authenticated EXECUTE가 없다'
);

-- (기본 권한 회수는 시퀀스에도 적용된다.)
create sequence public.__meta_probe_seq;

select is(
  (select coalesce(array_agg(r.rolname order by 1), '{}')
     from (values ('anon'), ('authenticated')) as r(rolname)
    where has_sequence_privilege(r.rolname, 'public.__meta_probe_seq', 'usage, select, update')),
  '{}'::text[],
  '기본 권한: 새 public 시퀀스에 anon·authenticated 권한이 없다'
);

select * from finish();
rollback;
