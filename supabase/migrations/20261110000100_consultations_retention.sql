-- 상담 신청 보관 기간(설계 13장 S12·S14). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/14_consultations_retention.test.sql, 03_consultations.test.sql, 05_classes.test.sql, 00_meta.test.sql
--
-- /privacy 약속: "등록으로 이어지지 않으면 신청일로부터 6개월 뒤 파기".
-- 그래서 status <> 'enrolled' 이고 created_at이 6개월보다 오래된 상담을 매일 지운다.
-- 감사 로그(private.audit_log)에는 DELETE가 actor null(cron은 로그인 사용자가 아니다)로 남는다.
-- 클라우드 Free에서도 pg_cron 확장이 켜지는지는 계획 7에서 확인한다(안 되면 대시보드에서 켠다).

create extension if not exists pg_cron;

create function private.purge_stale_consultations()
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.consultations
   where status <> 'enrolled'
     and created_at < pg_catalog.now() - interval '6 months';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
-- 소유자(postgres)와 cron만 부른다.
revoke all on function private.purge_stale_consultations() from public, anon, authenticated, service_role;

-- pg_cron은 UTC로 돈다: '0 18 * * *' = 매일 03:00 KST.
-- 다시 적용해도(db reset, 클라우드 db push) 작업이 하나만 남도록 같은 이름을 먼저 지운다.
do $$
begin
  perform cron.unschedule('purge-stale-consultations')
   where exists (select 1 from cron.job where jobname = 'purge-stale-consultations');
end;
$$;
select cron.schedule('purge-stale-consultations', '0 18 * * *', $$select private.purge_stale_consultations()$$);

-- ─── 권한 좁히기: 원장 화면이 쓰는 컬럼만 ────────────────────────────
-- consultations: 상태·메모만 고친다 (src/features/consultations 화면). 행 제한은 기존 정책(원장 aal2) 그대로다.
revoke update on public.consultations from authenticated;
grant update (status, memo) on public.consultations to authenticated;

-- classes: insert는 앱 createClass payload 컬럼만 (name, level, schedule, capacity).
revoke insert on public.classes from authenticated;
grant insert (name, level, schedule, capacity) on public.classes to authenticated;
