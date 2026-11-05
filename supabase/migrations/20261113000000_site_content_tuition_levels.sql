-- 수강료를 중등·고등으로 나누고 교재비를 뺀다(학원은 교재를 팔 수 없어요).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- tuition 값 모양: {middle, high, note} (각각 빈칸 또는 글자). 나머지 키는 20261112000000_site_images.sql 그대로.
-- 이미 저장된 값은 월 수강료(monthly)를 중등(middle)으로 옮기고 교재비(textbook)는 버린다.
-- 검사: supabase/tests/02_site_content.test.sql, 15_site_content_write.test.sql

create or replace function private.check_site_content()
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
  elsif new.key = 'about' then
    if pg_catalog.jsonb_typeof(v) <> 'object' then
      raise exception '%', msg;
    end if;
    for k, fv in select e.key, e.value from pg_catalog.jsonb_each(v) e loop
      if k = 'intro' then
        if pg_catalog.jsonb_typeof(fv) = 'null' then
          null;
        elsif pg_catalog.jsonb_typeof(fv) <> 'string'
              or pg_catalog.char_length(fv #>> '{}') > 300 then
          raise exception '%', msg;
        end if;
      elsif k = 'items' then
        if pg_catalog.jsonb_typeof(fv) <> 'array' or pg_catalog.jsonb_array_length(fv) > 10 then
          raise exception '%', msg;
        end if;
        for item in select e from pg_catalog.jsonb_array_elements(fv) e loop
          if pg_catalog.jsonb_typeof(item) <> 'object'
             or pg_catalog.jsonb_typeof(item -> 'title') is distinct from 'string'
             or pg_catalog.jsonb_typeof(item -> 'url') is distinct from 'string'
             or exists (select 1 from pg_catalog.jsonb_object_keys(item) ik where ik not in ('title', 'url', 'teaser', 'image'))
             -- image는 site-images 버킷 안 경로(about/<uuid>.jpg|png|webp)만. 바깥 주소는 넣을 수 없다.
             or coalesce(pg_catalog.jsonb_typeof(item -> 'image'), 'null') not in ('string', 'null')
             or coalesce(item ->> 'image', 'about/00000000-0000-0000-0000-000000000000.jpg')
                !~ '^about/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
             or coalesce(pg_catalog.jsonb_typeof(item -> 'teaser'), 'null') not in ('string', 'null')
             or pg_catalog.char_length(coalesce(item ->> 'teaser', '')) > 120
             or pg_catalog.char_length(pg_catalog.regexp_replace(item ->> 'title', '^[[:space:]]+|[[:space:]]+$', '', 'g'))
                not between 1 and 40
             -- Postgres 정규식은 반복 횟수가 255까지라서 길이(https:// 뒤 1~500자)는 따로 잰다.
             or (item ->> 'url') !~ '^https://[^[:space:]<>"''\\]+$'
             or pg_catalog.char_length(item ->> 'url') > 508 then
            raise exception '%', msg;
          end if;
        end loop;
      else
        raise exception '%', msg;
      end if;
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
         or (new.key = 'tuition' and k in ('middle', 'high', 'note'))
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

update public.site_content
   set value = jsonb_build_object('middle', value -> 'monthly', 'high', null, 'note', value -> 'note')
 where key = 'tuition' and (value ? 'monthly' or value ? 'textbook');
