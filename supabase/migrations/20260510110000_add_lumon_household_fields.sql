-- Persist Lumon/shared-household metadata for dashboard analytics and setup workflows.

alter table public.households
  add column if not exists is_lumon boolean not null default false,
  add column if not exists lumon_family_count integer not null default 1 check (lumon_family_count >= 1),
  add column if not exists lumon_description text,
  add column if not exists lumon_member_keys jsonb not null default '[]'::jsonb,
  add column if not exists lumon_member_names jsonb not null default '[]'::jsonb;

select pg_notify('pgrst', 'reload schema');
