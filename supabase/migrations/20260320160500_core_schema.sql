create sequence if not exists public.household_code_seq start 1000;
create sequence if not exists public.application_number_seq start 1000;

create table if not exists public.barangays (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  district text,
  municipality text not null default 'Barbaza',
  province text not null default 'Antique',
  region text not null default 'Region VI',
  zip_code text,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext,
  first_name text,
  middle_name text,
  last_name text,
  suffix_name text,
  display_name text,
  phone_number text,
  avatar_url text,
  default_barangay_id uuid references public.barangays (id) on delete set null,
  is_active boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null unique,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  barangay_id uuid references public.barangays (id) on delete cascade,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  household_code text not null unique,
  barangay_id uuid not null references public.barangays (id) on delete restrict,
  household_name text,
  address_line1 text not null,
  address_line2 text,
  purok_sitio text,
  postal_code text,
  registration_source text not null default 'self_service',
  household_size integer not null default 1 check (household_size >= 1),
  monthly_income numeric(12,2) check (monthly_income is null or monthly_income >= 0),
  poverty_level text,
  vulnerability_flags jsonb not null default '[]'::jsonb,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status public.household_status not null default 'active',
  registered_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  household_id uuid not null references public.households (id) on delete restrict,
  barangay_id uuid not null references public.barangays (id) on delete restrict,
  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix_name text,
  birth_date date,
  sex public.sex_type,
  civil_status public.civil_status_type not null default 'unknown',
  relationship_to_head public.relationship_type not null default 'other',
  phone_number text,
  email citext,
  occupation text,
  employment_status text,
  education_level text,
  monthly_income numeric(12,2) check (monthly_income is null or monthly_income >= 0),
  is_head boolean not null default false,
  is_pwd boolean not null default false,
  is_senior boolean not null default false,
  is_voter boolean not null default false,
  government_id_type text,
  government_id_number citext,
  status public.resident_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.households
  add column if not exists head_resident_id uuid references public.residents (id) on delete set null;

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  resident_id uuid not null references public.residents (id) on delete cascade,
  relationship_to_head public.relationship_type not null default 'other',
  is_head boolean not null default false,
  is_primary_contact boolean not null default false,
  start_date date not null default current_date,
  end_date date,
  remarks text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.land_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  resident_id uuid references public.residents (id) on delete set null,
  barangay_id uuid not null references public.barangays (id) on delete restrict,
  title_number text,
  tax_declaration_number text,
  lot_number text,
  land_classification text,
  area_sq_m numeric(14,2) check (area_sq_m is null or area_sq_m >= 0),
  tenure_status text,
  assessed_value numeric(14,2) check (assessed_value is null or assessed_value >= 0),
  location_description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.social_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  category text,
  description text,
  eligibility_summary text,
  status public.program_status not null default 'draft',
  requires_review boolean not null default true,
  max_active_applications_per_household integer not null default 1 check (max_active_applications_per_household >= 1),
  allow_multiple_household_beneficiaries boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.program_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.social_programs (id) on delete cascade,
  requirement_code text not null,
  label text not null,
  description text,
  document_group text,
  is_required boolean not null default true,
  is_for_household boolean not null default false,
  allowed_file_types text[] not null default array[]::text[],
  max_file_size_mb integer not null default 10 check (max_file_size_mb > 0),
  valid_for_days integer check (valid_for_days is null or valid_for_days > 0),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  unique (program_id, requirement_code)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_no text not null unique,
  resident_id uuid not null references public.residents (id) on delete restrict,
  household_id uuid not null references public.households (id) on delete restrict,
  barangay_id uuid not null references public.barangays (id) on delete restrict,
  submitted_by uuid references auth.users (id) on delete set null,
  intake_channel text not null default 'resident_portal',
  current_status public.application_status not null default 'draft',
  review_stage text,
  duplicate_risk_score numeric(5,2) check (duplicate_risk_score is null or duplicate_risk_score >= 0),
  duplicate_risk_reason text,
  priority_flags jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decided_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.application_programs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  program_id uuid not null references public.social_programs (id) on delete restrict,
  requested_amount numeric(12,2) check (requested_amount is null or requested_amount >= 0),
  approved_amount numeric(12,2) check (approved_amount is null or approved_amount >= 0),
  decision_status public.application_status not null default 'submitted',
  decision_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  unique (application_id, program_id)
);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  requirement_id uuid references public.program_requirements (id) on delete set null,
  resident_id uuid references public.residents (id) on delete set null,
  bucket_name text not null default 'application-documents',
  object_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  checksum text,
  status public.document_status not null default 'uploaded',
  remarks text,
  uploaded_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.assistance_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  resident_id uuid references public.residents (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  program_id uuid not null references public.social_programs (id) on delete restrict,
  barangay_id uuid not null references public.barangays (id) on delete restrict,
  assistance_type text not null,
  amount numeric(12,2) check (amount is null or amount >= 0),
  quantity numeric(12,2) check (quantity is null or quantity >= 0),
  unit text,
  funding_source text,
  reference_no text,
  status public.assistance_status not null default 'planned',
  approved_at timestamptz,
  released_at timestamptz,
  released_by uuid references auth.users (id) on delete set null,
  remarks text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.eligibility_assessments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  program_id uuid references public.social_programs (id) on delete set null,
  assessed_by uuid references auth.users (id) on delete set null,
  result public.assessment_result not null default 'pending',
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  criteria_snapshot jsonb not null default '{}'::jsonb,
  findings text,
  recommended_actions text,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_by_role_id uuid references public.roles (id) on delete set null,
  remarks text,
  metadata jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now()
);

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  household_id uuid references public.households (id) on delete cascade,
  resident_id uuid references public.residents (id) on delete cascade,
  barangay_id uuid references public.barangays (id) on delete set null,
  visibility public.note_visibility not null default 'internal',
  note_text text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  check (
    application_id is not null
    or household_id is not null
    or resident_id is not null
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  channel public.notification_channel not null default 'in_app',
  status public.notification_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  link_url text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  barangay_id uuid references public.barangays (id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  scope public.setting_scope not null default 'system',
  scope_ref_id uuid not null default '00000000-0000-0000-0000-000000000000',
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  check (
    (scope = 'system' and scope_ref_id = '00000000-0000-0000-0000-000000000000')
    or (scope <> 'system' and scope_ref_id <> '00000000-0000-0000-0000-000000000000')
  )
);

create unique index if not exists user_roles_unique_global_idx
  on public.user_roles (user_id, role_id)
  where barangay_id is null;

create unique index if not exists user_roles_unique_barangay_idx
  on public.user_roles (user_id, role_id, barangay_id)
  where barangay_id is not null;

create unique index if not exists household_members_active_resident_idx
  on public.household_members (resident_id)
  where end_date is null and archived_at is null;

create unique index if not exists residents_government_id_idx
  on public.residents (government_id_number)
  where government_id_number is not null;

create unique index if not exists settings_unique_scope_idx
  on public.settings (setting_key, scope, scope_ref_id);

create index if not exists profiles_default_barangay_idx on public.profiles (default_barangay_id);
create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_barangay_idx on public.user_roles (barangay_id);
create index if not exists households_barangay_idx on public.households (barangay_id);
create index if not exists households_status_idx on public.households (status);
create index if not exists households_name_trgm_idx on public.households using gin (household_name gin_trgm_ops);
create index if not exists residents_household_idx on public.residents (household_id);
create index if not exists residents_barangay_idx on public.residents (barangay_id);
create index if not exists residents_profile_idx on public.residents (profile_id);
create index if not exists residents_name_trgm_idx on public.residents using gin ((coalesce(first_name, '') || ' ' || coalesce(last_name, '')) gin_trgm_ops);
create index if not exists land_records_household_idx on public.land_records (household_id);
create index if not exists social_programs_status_idx on public.social_programs (status);
create index if not exists program_requirements_program_idx on public.program_requirements (program_id);
create index if not exists applications_resident_idx on public.applications (resident_id);
create index if not exists applications_household_idx on public.applications (household_id);
create index if not exists applications_barangay_idx on public.applications (barangay_id);
create index if not exists applications_status_idx on public.applications (current_status);
create index if not exists applications_submitted_at_idx on public.applications (submitted_at desc);
create index if not exists application_programs_program_idx on public.application_programs (program_id);
create index if not exists application_documents_application_idx on public.application_documents (application_id);
create index if not exists assistance_records_household_idx on public.assistance_records (household_id);
create index if not exists assistance_records_program_idx on public.assistance_records (program_id);
create index if not exists assistance_records_barangay_idx on public.assistance_records (barangay_id);
create index if not exists eligibility_assessments_application_idx on public.eligibility_assessments (application_id);
create index if not exists status_history_application_idx on public.status_history (application_id, changed_at desc);
create index if not exists internal_notes_application_idx on public.internal_notes (application_id);
create index if not exists internal_notes_barangay_idx on public.internal_notes (barangay_id);
create index if not exists notifications_user_idx on public.notifications (user_id, status);
create index if not exists audit_logs_table_record_idx on public.audit_logs (table_name, record_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
