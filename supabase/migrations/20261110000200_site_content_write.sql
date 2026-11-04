-- site_content 쓰기 모양 검사·권한 (계획 6 Task 7).
-- 20261105000000_site_content.sql(머리 주석 원본)은 이미 적용돼 고치지 않는다. 키별 value 모양의 현재 기준은 여기다.
-- DB는 snake_case, TS는 camelCase.
--   notice {title, body, visible} · classes [{name, grades, schedule, capacity}] (≤ 10칸, capacity 빈칸 또는 1~50)
--   tuition {monthly, textbook, note} · contact {phone, address} (phone 빈칸 또는 0xx-xxx(x)-xxxx)
--   legal {academy_name, registration_no, subjects, tuition_notice}
--   points_goal 정수 1~10000 (기본 30). 학생 홈 PointsProgress의 목표이고, 바꾸면 새 목표에서 한 번 더 축하한다.
-- 값 하나의 JSON 텍스트는 8192바이트 이하, 안의 문자열에는 제어 문자가 없다.
-- 쓰기는 key·value 컬럼만, delete는 없다(공지는 visible: false로 숨긴다).

alter table public.site_content
  add constraint site_content_key_known
  check (key in ('notice', 'classes', 'tuition', 'contact', 'legal', 'points_goal'));

create function private.check_site_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v jsonb := new.value;
  item jsonb;
  k text;
  fv jsonb;
  msg constant text := '랜딩 내용 형식이 맞지 않아요. 새로고침한 뒤 다시 저장해 주세요.';
begin
  if pg_catalog.octet_length(v::text) > 8192 then
    raise exception '%', msg;
  end if;
  if exists (
    select 1
      from pg_catalog.jsonb_path_query(v, 'strict $.** ? (@.type() == "string")') s
     where (s #>> '{}') ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'
  ) then
    raise exception '%', msg;
  end if;

  if new.key = 'points_goal' then
    if pg_catalog.jsonb_typeof(v) <> 'number'
       or (v #>> '{}')::numeric <> pg_catalog.trunc((v #>> '{}')::numeric)
       or (v #>> '{}')::numeric not between 1 and 10000 then
      raise exception '%', msg;
    end if;
  elsif new.key = 'classes' then
    if pg_catalog.jsonb_typeof(v) <> 'array' or pg_catalog.jsonb_array_length(v) > 10 then
      raise exception '%', msg;
    end if;
    for item in select e from pg_catalog.jsonb_array_elements(v) e loop
      if pg_catalog.jsonb_typeof(item) <> 'object' then
        raise exception '%', msg;
      end if;
      for k, fv in select e.key, e.value from pg_catalog.jsonb_each(item) e loop
        if k in ('name', 'grades', 'schedule') then
          if pg_catalog.jsonb_typeof(fv) not in ('string', 'null') then
            raise exception '%', msg;
          end if;
        elsif k = 'capacity' then
          if pg_catalog.jsonb_typeof(fv) = 'null' then
            null;
          elsif pg_catalog.jsonb_typeof(fv) <> 'number'
                or (fv #>> '{}')::numeric <> pg_catalog.trunc((fv #>> '{}')::numeric)
                or (fv #>> '{}')::numeric not between 1 and 50 then
            raise exception '%', msg;
          end if;
        else
          raise exception '%', msg;
        end if;
      end loop;
    end loop;
  else
    if pg_catalog.jsonb_typeof(v) <> 'object' then
      raise exception '%', msg;
    end if;
    for k, fv in select e.key, e.value from pg_catalog.jsonb_each(v) e loop
      if new.key = 'notice' and k = 'visible' then
        if pg_catalog.jsonb_typeof(fv) <> 'boolean' then
          raise exception '%', msg;
        end if;
      elsif (new.key = 'notice' and k in ('title', 'body'))
         or (new.key = 'tuition' and k in ('monthly', 'textbook', 'note'))
         or (new.key = 'contact' and k = 'address')
         or (new.key = 'legal' and k in ('academy_name', 'registration_no', 'subjects', 'tuition_notice')) then
        if pg_catalog.jsonb_typeof(fv) not in ('string', 'null') then
          raise exception '%', msg;
        end if;
      elsif new.key = 'contact' and k = 'phone' then
        if pg_catalog.jsonb_typeof(fv) = 'null' then
          null;
        elsif pg_catalog.jsonb_typeof(fv) <> 'string'
              or (fv #>> '{}') !~ '^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$' then
          raise exception '%', msg;
        end if;
      else
        raise exception '%', msg;
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.check_site_content() from public, anon, authenticated, service_role;

create trigger site_content_check
  before insert or update on public.site_content
  for each row execute function private.check_site_content();

-- delete 권한이 없으니 쓸 수 없는 delete 정책은 없앤다.
drop policy if exists site_content_admin_delete on public.site_content;

-- upsert는 key·value를 set에 넣는다. updated_at은 서버 트리거가 갱신한다.
revoke insert, update, delete on public.site_content from authenticated;
grant insert (key, value), update (key, value) on public.site_content to authenticated;
