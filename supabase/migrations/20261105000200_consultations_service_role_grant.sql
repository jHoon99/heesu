-- service_role 권한을 명시한다: submit_consultation(security invoker)은 건수 확인에 SELECT, 신청 저장에 INSERT만 쓴다.
revoke all on public.consultations from service_role;
grant select, insert on public.consultations to service_role;

comment on function public.submit_consultation(text, text, public.school_grade, text, text) is
  '번호별 24시간 3건 제한. advisory lock으로 줄 세운 뒤 건수를 확인하므로 READ COMMITTED 격리 수준(기본값)에 의존한다. REPEATABLE READ 이상에서는 제한이 깨질 수 있다.';
