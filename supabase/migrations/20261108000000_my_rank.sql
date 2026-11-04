-- 학생 홈의 내 순위 RPC와 보상 목표 설정(아키텍처 §13, v1 스펙 §7·§11).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/09_my_rank.test.sql, 00_meta.test.sql(함수 허용 목록)
-- security definer인 이유: 학생은 RLS로 자기 합계만 읽을 수 있어 순위를 못 구한다. 이 함수는 숫자 두 개만 내보낸다(spec §7·§11).
--   순위는 재원(active) 학생만, 누적 포인트 내림차순, 동점 같은 순위(1, 2, 2, 4). total = 재원 학생 수.
--   호출자가 재원 학생이 아니면(휴원·퇴원·원장·아무나) 0행. 인자가 없어 다른 학생을 물어볼 수 없다.
-- `site_content` 키 `points_goal`: jsonb 정수 1~10000(학생 홈 보상 목표, 없으면 30).
-- 감사 대상 아님(읽기 전용). service_role(Edge Function)은 이 함수를 부르지 않으므로 권한을 주지 않는다.

create function public.my_rank()
returns table (rank int, total int)
language sql
stable
security definer
set search_path = ''
as $$
  select r.rnk, r.cnt
    from (
      select s.id,
             (pg_catalog.rank() over (order by coalesce(sum(p.amount), 0) desc))::int as rnk,
             (pg_catalog.count(*) over ())::int as cnt
        from public.students s
        left join public.points p on p.student_id = s.id
       where s.status = 'active'
       group by s.id
    ) r
   where r.id = (select private.my_student_id());
$$;
revoke all on function public.my_rank() from public, anon, authenticated, service_role;
grant execute on function public.my_rank() to authenticated;
