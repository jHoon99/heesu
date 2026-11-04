-- 수기 수납 기록(설계 13장 S1·S12). 원장만 읽고 쓰며, 모든 변경은 private.audit()로 남는다.
-- 검사: supabase/tests/16_payments.test.sql, 00_meta.test.sql(감사 트리거 목록)
-- 수납 기록은 퇴원 뒤에도 보존 대상(S12) — 학생 행을 지우지 않으므로 cascade는 실제로 일어나지 않는다.
-- 실제 결제와 연결되지 않는 수기 기록이다. paid_at이 비어 있으면 미납.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount int not null check (amount between 0 and 10000000),
  paid_at date,
  memo text check (memo is null or (char_length(memo) <= 200 and memo !~ '[[:cntrl:]]')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, month)
);
create index payments_month_idx on public.payments (month);
alter table public.payments enable row level security;

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 원장 화면만(upsert라 insert·update 컬럼을 같게). id·created_at·updated_at은 서버가 채운다.
revoke all on public.payments from anon, authenticated, service_role;
grant select, delete on public.payments to authenticated;
grant insert (student_id, month, amount, paid_at, memo),
      update (student_id, month, amount, paid_at, memo) on public.payments to authenticated;

-- ─── 정책 (private.*를 부르므로 to authenticated) ────────────────────
create policy payments_admin_select on public.payments
  for select to authenticated
  using ((select private.is_admin()));
create policy payments_admin_insert on public.payments
  for insert to authenticated
  with check ((select private.is_admin()));
create policy payments_admin_update on public.payments
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy payments_admin_delete on public.payments
  for delete to authenticated
  using ((select private.is_admin()));

-- ─── 감사 ───────────────────────────────────────────────────────────
create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function private.audit();
