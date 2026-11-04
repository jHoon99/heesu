-- 포인트·자동 포인트 트리거·학생별 합계 view(설계 13장 S1·S3, 아키텍처 §7, v1 스펙 §7·§11).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/08_points.test.sql, 00_meta.test.sql(view security_invoker, 함수 허용 목록)
-- 포인트는 DB가 계산한다(아키텍처 §7). 규칙을 바꾸면 이 트리거만 고친다.
--   자동: 출결 present|makeup + 숙제 done = 학생·수업마다 +1 한 행(session_id 있음). 조건이 깨지면 그 행을 지운다.
--   수동: 원장이 session_id 없이 사유와 함께 넣는다. 고치거나 지우지 않는다(틀리면 반대 금액으로 새 행).
-- 감사 대상 아님(spec §7 목록에 없다). service_role(Edge Function)은 이 테이블을 쓰지 않으므로 권한을 주지 않는다.

-- ─── 테이블 ─────────────────────────────────────────────────────────
create table public.points (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  session_id uuid references public.sessions on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now(),
  check ((session_id is not null and amount = 1)
         or (session_id is null and amount between -100 and 100 and amount <> 0)),
  check (char_length(btrim(reason)) between 1 and 100 and reason !~ '[[:cntrl:]]')
);
alter table public.points enable row level security;
-- 자동 행은 학생·수업마다 하나. 트리거의 on conflict 대상이기도 하다.
create unique index points_auto_once on public.points (session_id, student_id) where session_id is not null;
create index points_student_id_created_at_idx on public.points (student_id, created_at desc);

-- ─── 자동 포인트 트리거 ───────────────────────────────────────────────
-- 출결·숙제가 바뀔 때마다 그 (수업, 학생)의 현재 상태를 두 테이블에서 다시 읽어 자동 행을 맞춘다(행이 없으면 none).
-- 동시성: 같은 학생·수업의 출결과 숙제를 두 트랜잭션이 동시에 바꾸면, 각자 상대의 커밋 전 값을 읽어
-- 둘 다 "조건 아님"으로 판단할 수 있다. 그래서 (수업, 학생) 단위 advisory xact lock으로 이 계산을 줄 세운다:
-- 나중 트랜잭션은 앞 트랜잭션이 커밋할 때까지 기다린 뒤(READ COMMITTED라 문장마다 새 스냅샷) 커밋된 값을 읽는다.
-- 중복 insert는 points_auto_once + on conflict do nothing이 한 번 더 막는다.
-- security definer: 클라이언트에는 points.session_id 쓰기 권한이 없고, 학생의 submit_homework도 이 트리거를 거친다.
create function private.sync_session_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_att public.attendance_status;
  v_hw public.homework_status;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.session_id::text || ':' || new.student_id::text, 0));

  select a.status into v_att
    from public.attendance a
   where a.session_id = new.session_id and a.student_id = new.student_id;
  select h.status into v_hw
    from public.homework_checks h
   where h.session_id = new.session_id and h.student_id = new.student_id;

  if coalesce(v_att, 'none') in ('present', 'makeup') and coalesce(v_hw, 'none') = 'done' then
    insert into public.points (student_id, session_id, amount, reason)
    values (new.student_id, new.session_id, 1, '출석·숙제 완료')
    on conflict (session_id, student_id) where session_id is not null do nothing;
  else
    -- 수동 행은 session_id가 null이라 여기서 지워지지 않는다.
    delete from public.points
     where session_id = new.session_id and student_id = new.student_id;
  end if;
  return null;
end;
$$;
revoke all on function private.sync_session_points() from public, anon, authenticated, service_role;

create trigger attendance_sync_points
  after insert or update of status on public.attendance
  for each row execute function private.sync_session_points();
create trigger homework_checks_sync_points
  after insert or update of status on public.homework_checks
  for each row execute function private.sync_session_points();

-- ─── 학생별 합계 view ────────────────────────────────────────────────
-- security_invoker라 students·points RLS가 그대로 걸린다(원장은 전부, 학생은 자기 1행, 퇴원생은 0행).
create view public.student_point_totals
with (security_invoker = true)
as
select s.id as student_id, s.name, s.grade, s.status, coalesce(sum(p.amount), 0)::int as total
  from public.students s
  left join public.points p on p.student_id = s.id
 group by s.id;

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 플랫폼 기본값에 기대지 않는다: 모두 회수한 뒤 필요한 것만 준다.
revoke all on public.points from anon, authenticated, service_role;
revoke all on public.student_point_totals from anon, authenticated, service_role;

-- insert는 컬럼 단위: session_id를 못 쓰니 클라이언트는 자동 행을 위조할 수 없다. update·delete 없음(추가만).
grant select on public.points to authenticated;
grant insert (student_id, amount, reason) on public.points to authenticated;
grant select on public.student_point_totals to authenticated;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy points_admin_select on public.points
  for select to authenticated
  using ((select private.is_admin()));
create policy points_admin_insert on public.points
  for insert to authenticated
  with check ((select private.is_admin()) and session_id is null);
create policy points_self_select on public.points
  for select to authenticated
  using (student_id = (select private.my_student_id()));
