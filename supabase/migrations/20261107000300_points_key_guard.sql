-- 출결·숙제 행의 키 옮기기 금지와 삭제 시 포인트 다시 맞추기(아키텍처 §7, v1 스펙 §11).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/08_points.test.sql
-- 문제: authenticated는 PostgREST upsert 때문에 attendance·homework_checks의 session_id·student_id update 권한이 있다.
-- 자동 포인트 트리거는 NEW 쌍만 다시 계산하므로, 키를 옮기면 OLD 쌍의 자동 행이 남아 점수가 두 번 붙을 수 있었다.
--   (a) 키를 다른 값으로 바꾸는 update는 막는다. upsert는 같은 값을 다시 넣으므로 그대로 통과한다.
--   (b) 행을 지우면 OLD 쌍을 다시 계산한다(클라이언트에는 delete 권한이 없다: postgres·cascade만).

-- ─── (a) 키 옮기기 금지 ──────────────────────────────────────────────
-- 같은 시점 트리거는 이름순: check_member가 먼저 돌아 다른 반 학생으로는 그 문구로, 같은 반 안의 옮기기는 이 문구로 거부한다.
create function private.block_key_move()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.session_id is distinct from old.session_id or new.student_id is distinct from old.student_id then
    raise exception '출결·숙제 기록은 다른 수업이나 학생으로 옮길 수 없어요.';
  end if;
  return new;
end;
$$;
revoke all on function private.block_key_move() from public, anon, authenticated, service_role;

create trigger attendance_forbid_key_move
  before update of session_id, student_id on public.attendance
  for each row execute function private.block_key_move();
create trigger homework_checks_forbid_key_move
  before update of session_id, student_id on public.homework_checks
  for each row execute function private.block_key_move();

-- ─── (b) 삭제 때도 다시 계산 ─────────────────────────────────────────
-- 20261107000200_points.sql의 함수를 바꾼다: insert·update는 NEW 쌍, delete는 OLD 쌍을 다시 계산한다.
create or replace function private.sync_session_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_student_id uuid;
  v_att public.attendance_status;
  v_hw public.homework_status;
begin
  if tg_op = 'DELETE' then
    v_session_id := old.session_id;
    v_student_id := old.student_id;
  else
    v_session_id := new.session_id;
    v_student_id := new.student_id;
  end if;

  -- (수업, 학생) 단위로 계산을 줄 세운다(설명은 20261107000200_points.sql).
  -- 여러 행을 서로 다른 순서로 저장하는 두 트랜잭션은 교착될 수 있다: 원장 한 명이 쓰는 앱이라 드물고, 재시도하면 된다.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_session_id::text || ':' || v_student_id::text, 0));

  select a.status into v_att
    from public.attendance a
   where a.session_id = v_session_id and a.student_id = v_student_id;
  select h.status into v_hw
    from public.homework_checks h
   where h.session_id = v_session_id and h.student_id = v_student_id;

  if coalesce(v_att, 'none') in ('present', 'makeup') and coalesce(v_hw, 'none') = 'done' then
    insert into public.points (student_id, session_id, amount, reason)
    values (v_student_id, v_session_id, 1, '출석·숙제 완료')
    on conflict (session_id, student_id) where session_id is not null do nothing;
  else
    -- 수동 행은 session_id가 null이라 여기서 지워지지 않는다.
    delete from public.points
     where session_id = v_session_id and student_id = v_student_id;
  end if;
  return null;
end;
$$;
revoke all on function private.sync_session_points() from public, anon, authenticated, service_role;

create trigger attendance_sync_points_on_delete
  after delete on public.attendance
  for each row execute function private.sync_session_points();
create trigger homework_checks_sync_points_on_delete
  after delete on public.homework_checks
  for each row execute function private.sync_session_points();
