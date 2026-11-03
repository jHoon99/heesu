-- 랜딩 공개 문구(공지·반·수강료·연락처·법정 표시). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/02_site_content.test.sql
-- anon·authenticated는 읽기만, 쓰기는 원장(private.is_admin(): admins + aal2)만.
-- 키별 value 모양: notice {title, body, visible} · classes [{name, grades, schedule, capacity}]
--   · tuition {monthly, textbook, note} · contact {phone, address}
--   · legal {academy_name, registration_no, subjects, tuition_notice}

create table public.site_content (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- 읽기 정책은 private.*를 부르지 않으므로 anon도 함께 둔다.
create policy site_content_read on public.site_content
  for select to anon, authenticated
  using (true);
-- private.is_admin()을 부르는 정책은 모두 to authenticated (anon은 그 함수 권한이 없다).
create policy site_content_admin_insert on public.site_content
  for insert to authenticated
  with check (private.is_admin());
create policy site_content_admin_update on public.site_content
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());
create policy site_content_admin_delete on public.site_content
  for delete to authenticated
  using (private.is_admin());

-- updated_at은 클라이언트 값과 상관없이 서버 시각으로 갱신한다.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function private.set_updated_at();
