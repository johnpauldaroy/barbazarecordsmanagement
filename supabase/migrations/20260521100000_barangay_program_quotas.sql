-- Barangay Distribution Quotas
-- Adds per-barangay per-program annual slot allocation with live usage tracking.

-- ============================================================
-- Table: barangay_program_quotas
-- ============================================================
create table if not exists public.barangay_program_quotas (
  id                uuid primary key default gen_random_uuid(),
  barangay_id       uuid not null references public.barangays (id) on delete cascade,
  program_id        uuid not null references public.social_programs (id) on delete cascade,
  period_year       integer not null check (period_year >= 2020 and period_year <= 2100),
  max_beneficiaries integer not null check (max_beneficiaries >= 0),
  notes             text,
  is_active         boolean not null default true,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null,
  updated_by        uuid references auth.users (id) on delete set null
);

-- Unique active quota per barangay + program + year
create unique index if not exists barangay_program_quotas_unique_idx
  on public.barangay_program_quotas (barangay_id, program_id, period_year)
  where archived_at is null;

create index if not exists barangay_program_quotas_barangay_idx
  on public.barangay_program_quotas (barangay_id);

create index if not exists barangay_program_quotas_program_idx
  on public.barangay_program_quotas (program_id);

create index if not exists barangay_program_quotas_year_idx
  on public.barangay_program_quotas (period_year);

-- ============================================================
-- Triggers: updated_at and audit actor (match existing pattern)
-- ============================================================
drop trigger if exists barangay_program_quotas_set_updated_at
  on public.barangay_program_quotas;
create trigger barangay_program_quotas_set_updated_at
  before update on public.barangay_program_quotas
  for each row execute function public.set_updated_at();

drop trigger if exists barangay_program_quotas_set_audit_actor
  on public.barangay_program_quotas;
create trigger barangay_program_quotas_set_audit_actor
  before insert or update on public.barangay_program_quotas
  for each row execute function public.set_audit_actor();

drop trigger if exists barangay_program_quotas_write_audit_log
  on public.barangay_program_quotas;
create trigger barangay_program_quotas_write_audit_log
  after insert or update or delete on public.barangay_program_quotas
  for each row execute function public.write_audit_log();

-- ============================================================
-- RLS
-- ============================================================
alter table public.barangay_program_quotas enable row level security;

drop policy if exists bpq_select_policy on public.barangay_program_quotas;
create policy bpq_select_policy
  on public.barangay_program_quotas
  for select
  using (auth.role() = 'authenticated');

drop policy if exists bpq_modify_policy on public.barangay_program_quotas;
create policy bpq_modify_policy
  on public.barangay_program_quotas
  for all
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ============================================================
-- View: quota_usage_view
-- Live-computed usage count — no counter drift when statuses change.
-- Counted statuses: under_review, verified, approved, released.
-- Year is derived from decided_at (fallback: submitted_at, created_at).
-- ============================================================
drop view if exists public.quota_usage_view;
create or replace view public.quota_usage_view as
select
  q.id              as quota_id,
  q.barangay_id,
  b.name            as barangay_name,
  q.program_id,
  sp.code           as program_code,
  sp.name           as program_name,
  q.period_year,
  q.max_beneficiaries,
  q.is_active,
  q.notes,
  count(distinct a.id) filter (
    where a.current_status in ('under_review', 'verified', 'approved', 'released')
      and a.archived_at is null
      and extract(year from coalesce(a.decided_at, a.submitted_at, a.created_at))::integer = q.period_year
  ) as used_count,
  greatest(
    0,
    q.max_beneficiaries - count(distinct a.id) filter (
      where a.current_status in ('under_review', 'verified', 'approved', 'released')
        and a.archived_at is null
        and extract(year from coalesce(a.decided_at, a.submitted_at, a.created_at))::integer = q.period_year
    )
  ) as remaining_count
from public.barangay_program_quotas q
join public.barangays b on b.id = q.barangay_id
join public.social_programs sp on sp.id = q.program_id
left join public.applications a on a.barangay_id = q.barangay_id
left join public.application_programs ap
  on ap.application_id = a.id and ap.program_id = q.program_id
where q.archived_at is null
group by q.id, b.name, sp.code, sp.name;

-- ============================================================
-- RPC: check_barangay_quota
-- Called by the frontend and the transition RPC to read quota status
-- for a specific barangay + program + year combination.
-- Returns one row or zero rows (no quota configured).
-- ============================================================
create or replace function public.check_barangay_quota(
  p_barangay_id uuid,
  p_program_id  uuid,
  p_year        integer default extract(year from now())::integer
)
returns table (
  quota_id          uuid,
  max_beneficiaries integer,
  used_count        bigint,
  remaining_count   bigint,
  is_active         boolean,
  quota_exists      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    qv.quota_id,
    qv.max_beneficiaries,
    qv.used_count,
    qv.remaining_count,
    qv.is_active,
    true as quota_exists
  from public.quota_usage_view qv
  where qv.barangay_id = p_barangay_id
    and qv.program_id  = p_program_id
    and qv.period_year = p_year
  limit 1;
$$;

grant execute on function public.check_barangay_quota(uuid, uuid, integer) to authenticated;

select pg_notify('pgrst', 'reload schema');
