-- 메타 테스트: 보안 기본값(설계 13장 S2)이 어긋나면 실패한다.
--
-- 함수 허용 목록 규칙: 스키마별로 `proname`(스키마 없는 함수 이름)만 담은
-- 정렬·중복 제거된 text[]로 비교한다. 새 함수를 anon/authenticated에 열 때는
-- 아래 해당 스키마의 허용 목록에 이름을 알파벳 순으로 추가한다.
-- `admin_user_exists`·`submit_consultation`은 service_role 전용이라 anon·authenticated 목록에 없고,
-- service_role 목록에만 있다. service_role에 함수를 열 때도 그 목록을 고친다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(21);

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
  '{guardian_view}'::text[],
  'public: anon이 실행할 수 있는 함수 = 허용 목록'
);

-- S2: authenticated가 실행할 수 있는 public 함수 = 허용 목록.
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('authenticated', p.oid, 'execute')),
  '{guardian_view,issue_guardian_token,my_rank,my_role,password_changed,save_video_progress,submit_homework}'::text[],
  'public: authenticated가 실행할 수 있는 함수 = 허용 목록'
);

-- S2: service_role이 실행할 수 있는 public 함수 = 허용 목록 (Edge Function이 부르는 것만).
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('service_role', p.oid, 'execute')),
  '{admin_user_exists,submit_consultation}'::text[],
  'public: service_role이 실행할 수 있는 함수 = 허용 목록'
);

-- S2: authenticated가 실행할 수 있는 private 함수 = 허용 목록 (RLS 정책용 헬퍼만).
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('authenticated', p.oid, 'execute')),
  '{can_join_question_topic,is_admin,my_school,my_student_id}'::text[],
  'private: authenticated가 실행할 수 있는 함수 = 허용 목록'
);

-- S2: service_role은 private 함수를 하나도 실행할 수 없다.
select is(
  (select coalesce(array_agg(distinct p.proname::text order by p.proname::text), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('service_role', p.oid, 'execute')),
  '{}'::text[],
  'private: service_role이 실행할 수 있는 함수가 없다'
);

-- S2: security definer 함수는 모두 search_path = ''를 고정한다.
-- 우리 스키마(public·private)는 소유자와 상관없이 전부, 그 밖(Supabase가 관리하는 auth·storage 등)은
-- postgres 소유만 본다. 시스템 스키마는 제외.
select is(
  (select coalesce(array_agg(n.nspname || '.' || p.proname order by 1), '{}')
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and (n.nspname in ('public', 'private') or pg_get_userbyid(p.proowner) = 'postgres')
      and p.prosecdef
      and not ('search_path=""' = any(coalesce(p.proconfig, '{}')))),
  '{}'::text[],
  'security definer 함수(public·private 전부, 그 밖은 postgres 소유)는 모두 search_path = '''' 설정이 있다'
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

-- S9: storage.objects 정책 = 허용 목록(버킷 site-images·videos). 새 버킷 정책을 만들 때 여기에 이름을 알파벳 순으로 추가한다.
-- storage.buckets에는 정책을 두지 않는다(클라이언트가 버킷 목록을 볼 일이 없다).
select is(
  (select coalesce(array_agg(policyname::text order by policyname), '{}')
     from pg_catalog.pg_policies
    where schemaname = 'storage'),
  '{materials_admin_delete,materials_admin_insert,materials_admin_select,materials_member_select,site_images_admin_delete,site_images_admin_insert,site_images_admin_select,videos_admin_delete,videos_admin_insert,videos_admin_select,videos_admin_update,videos_member_select}'::text[],
  'storage: 정책 = 허용 목록'
);

-- S9: 공개 버킷 = site-images뿐(공개 버킷의 파일은 정책 없이 누구나 URL로 읽는다). 홈페이지 홍보 사진만 둔다.
select is(
  (select coalesce(array_agg(id order by id), '{}') from storage.buckets where public),
  '{site-images}'::text[],
  'storage: 공개 버킷 = site-images뿐'
);

-- S8: Realtime publication = questions·answers뿐. 다른 테이블을 실으면 postgres_changes로 새어 나갈 수 있다.
select is(
  (select coalesce(array_agg(schemaname || '.' || tablename order by schemaname, tablename), '{}')
     from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'),
  '{public.answers,public.questions}'::text[],
  'realtime: publication = questions, answers'
);

-- S8: REPLICA IDENTITY FULL 금지(변경 전 행 전체가 WAL에 실리고 delete 이벤트로 새어 나간다).
select is(
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relreplident = 'f'),
  0,
  'REPLICA IDENTITY FULL 테이블이 없다'
);

-- S12: 감사 트리거(private.audit)가 달린 public 테이블 = spec §7 감사 대상 목록.
-- 감사 대상 테이블을 새로 만들 때(예: payments) 여기에 이름을 알파벳 순으로 추가한다.
select is(
  (select coalesce(array_agg(distinct c.relname::text order by c.relname::text), '{}')
     from pg_catalog.pg_trigger t
     join pg_catalog.pg_class c on c.oid = t.tgrelid
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     join pg_catalog.pg_proc p on p.oid = t.tgfoid
     join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    where n.nspname = 'public'
      and pn.nspname = 'private'
      and p.proname = 'audit'
      and not t.tgisinternal),
  '{consents,consultations,counsel_notes,guardian_tokens,payments,student_private,students}'::text[],
  'S12: 감사 트리거가 달린 public 테이블 = 허용 목록'
);

-- S12: 감사 트리거는 모두 AFTER … FOR EACH ROW, INSERT·UPDATE·DELETE 전부, 컬럼 목록(update of)·WHEN 조건 없음.
-- tgtype 비트: ROW 1, BEFORE 2, INSERT 4, DELETE 8, UPDATE 16, TRUNCATE 32, INSTEAD 64 → 기대값 1+4+8+16 = 29.
select is(
  (select coalesce(array_agg(c.relname || ':' || t.tgname order by 1), '{}')
     from pg_catalog.pg_trigger t
     join pg_catalog.pg_class c on c.oid = t.tgrelid
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     join pg_catalog.pg_proc p on p.oid = t.tgfoid
     join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    where n.nspname = 'public'
      and pn.nspname = 'private'
      and p.proname = 'audit'
      and not t.tgisinternal
      and ((t.tgtype::int & 127) <> 29
           or t.tgqual is not null
           or coalesce(cardinality(t.tgattr::int2[]), 0) > 0)),
  '{}'::text[],
  'S12: 감사 트리거는 모두 AFTER·FOR EACH ROW·INSERT|UPDATE|DELETE (컬럼 목록·WHEN 없음)'
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
