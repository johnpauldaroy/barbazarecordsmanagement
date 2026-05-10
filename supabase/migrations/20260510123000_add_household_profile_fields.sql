-- Persist household profile details entered in the portal form so edits survive page refresh.

alter table public.households
  add column if not exists head_last_name text,
  add column if not exists head_first_name text,
  add column if not exists head_middle_name text,
  add column if not exists head_suffix text,
  add column if not exists head_date_of_birth date,
  add column if not exists head_gender text,
  add column if not exists head_civil_status text,
  add column if not exists head_religion text,
  add column if not exists head_contact_number text,
  add column if not exists head_school_background text,
  add column if not exists head_occupation text,
  add column if not exists head_monthly_income numeric(12,2),
  add column if not exists family_members jsonb not null default '[]'::jsonb;

select pg_notify('pgrst', 'reload schema');
