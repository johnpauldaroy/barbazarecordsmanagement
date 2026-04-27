insert into public.barangays (code, name, district)
values
  ('BAGHARI', 'Baghari', 'Central'),
  ('BAHUYAN', 'Bahuyan', 'Central'),
  ('BERI', 'Beri', 'Central'),
  ('BIGA-A', 'Biga-a', 'Central'),
  ('BINANGBANG', 'Binangbang', 'Central'),
  ('BINONGAAN', 'Binongaan', 'Central'),
  ('CADIAO', 'Cadiao', 'Central'),
  ('CAPOYUAN', 'Capoyuan', 'Central'),
  ('ESPARAR', 'Esparar', 'Central'),
  ('GUA', 'Gua', 'Central'),
  ('IDAO', 'Idao', 'Central'),
  ('IGPALGE', 'Igpalge', 'Central'),
  ('IGTUNARUM', 'Igtunarum', 'Central'),
  ('JINALINAN', 'Jinalinan', 'Central'),
  ('LANAS', 'Lanas', 'Central'),
  ('MABLAD', 'Mablad', 'Central'),
  ('MAGTULIS', 'Magtulis', 'Central'),
  ('MARARI', 'Marari', 'Central'),
  ('MAYABAY', 'Mayabay', 'Central'),
  ('MAYHA', 'Mayha', 'Central'),
  ('NALOOK', 'Nalook', 'Central'),
  ('NARIRONG', 'Narirong', 'Central'),
  ('PALMIRA', 'Palmira', 'Central'),
  ('PANGPANG', 'Pangpang', 'Central'),
  ('PASONG', 'Pasong', 'Central'),
  ('POBLACION', 'Poblacion', 'Central'),
  ('SAN_ANTONIO', 'San Antonio', 'Central'),
  ('SAN_ROQUE', 'San Roque', 'Central'),
  ('TABONGTABONG', 'Tabongtabong', 'Central'),
  ('TALO-ATO', 'Talo-ato', 'Central'),
  ('TIGBABOY', 'Tigbaboy', 'Central'),
  ('TUNO', 'Tuno', 'Central'),
  ('IPIL', 'Ipil', 'Central'),
  ('LANGCAON', 'Langcaon', 'Central'),
  ('LISUB', 'Lisub', 'Central'),
  ('MARADIONA', 'Maradiona', 'Central'),
  ('SAN_RAMON', 'San Ramon', 'Central'),
  ('SOLIDO', 'Solido', 'Central'),
  ('SAN_JOSE', 'San Jose', 'Central')
on conflict (code) do update
set
  name = excluded.name,
  district = excluded.district,
  updated_at = now();

insert into public.social_programs (
  code,
  name,
  category,
  description,
  eligibility_summary,
  status,
  requires_review,
  max_active_applications_per_household,
  allow_multiple_household_beneficiaries,
  sort_order
)
values
  (
    'AICS',
    'Assistance to Individuals in Crisis Situation',
    'Emergency Assistance',
    'Crisis-based assistance with validation, documentary review, and release tracking.',
    'For households or residents with urgent social welfare needs subject to documentary validation.',
    'active',
    true,
    1,
    false,
    10
  ),
  (
    'TUPAD',
    'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers',
    'Livelihood Support',
    'Short-term emergency employment assistance with barangay coordination and beneficiary tracking.',
    'For displaced or disadvantaged workers meeting labor-oriented documentary and screening rules.',
    'active',
    true,
    1,
    false,
    20
  ),
  (
    '4PS_MONITORING',
    '4Ps Monitoring',
    'Program Visibility',
    'Household participation and overlap monitoring for descriptive analytics and coordinated support.',
    'For visibility into Pantawid Pamilyang Pilipino Program participation and overlap with local assistance.',
    'active',
    false,
    3,
    true,
    30
  )
on conflict (code) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  eligibility_summary = excluded.eligibility_summary,
  status = excluded.status,
  requires_review = excluded.requires_review,
  max_active_applications_per_household = excluded.max_active_applications_per_household,
  allow_multiple_household_beneficiaries = excluded.allow_multiple_household_beneficiaries,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.program_requirements (
  program_id,
  requirement_code,
  label,
  description,
  document_group,
  is_required,
  is_for_household,
  allowed_file_types,
  max_file_size_mb,
  sort_order
)
select
  sp.id,
  req.requirement_code,
  req.label,
  req.description,
  req.document_group,
  req.is_required,
  req.is_for_household,
  req.allowed_file_types,
  req.max_file_size_mb,
  req.sort_order
from public.social_programs sp
join (
  values
    (
      'AICS',
      'VALID_ID',
      'Valid Government ID',
      'Any accepted government-issued ID for the applicant.',
      'identity',
      true,
      false,
      array['application/pdf', 'image/jpeg', 'image/png']::text[],
      10,
      10
    ),
    (
      'AICS',
      'CRISIS_PROOF',
      'Crisis Proof Document',
      'Medical abstract, police report, or equivalent proof of crisis.',
      'supporting',
      true,
      false,
      array['application/pdf', 'image/jpeg', 'image/png']::text[],
      10,
      20
    ),
    (
      'TUPAD',
      'BARANGAY_CERT',
      'Barangay Certification',
      'Barangay-issued certification supporting worker eligibility.',
      'eligibility',
      true,
      true,
      array['application/pdf', 'image/jpeg', 'image/png']::text[],
      10,
      10
    ),
    (
      'TUPAD',
      'WORKER_PROFILE',
      'Worker Profile Form',
      'Completed worker or household employment profile.',
      'eligibility',
      true,
      false,
      array['application/pdf', 'image/jpeg', 'image/png']::text[],
      10,
      20
    ),
    (
      '4PS_MONITORING',
      'HH_REFERENCE',
      'Household Reference Number',
      'Reference material used to link the household to 4Ps monitoring records.',
      'reference',
      false,
      true,
      array['application/pdf', 'image/jpeg', 'image/png']::text[],
      10,
      10
    )
) as req (
  program_code,
  requirement_code,
  label,
  description,
  document_group,
  is_required,
  is_for_household,
  allowed_file_types,
  max_file_size_mb,
  sort_order
) on req.program_code = sp.code
on conflict (program_id, requirement_code) do update
set
  label = excluded.label,
  description = excluded.description,
  document_group = excluded.document_group,
  is_required = excluded.is_required,
  is_for_household = excluded.is_for_household,
  allowed_file_types = excluded.allowed_file_types,
  max_file_size_mb = excluded.max_file_size_mb,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.settings (setting_key, scope, value, description, is_public)
values
  (
    'system.identity',
    'system',
    jsonb_build_object(
      'municipality_name', 'Barbaza',
      'province', 'Antique',
      'default_timezone', 'Asia/Singapore'
    ),
    'Default municipal identity and deployment-wide metadata.',
    true
  ),
  (
    'applications.duplicate_window_days',
    'system',
    jsonb_build_object('days', 90),
    'Window used by duplicate-risk checks against recent assistance and application history.',
    false
  ),
  (
    'storage.application_documents',
    'system',
    jsonb_build_object(
      'bucket', 'application-documents',
      'path_pattern', '<application_id>/<user_id>/<filename>'
    ),
    'Expected storage path convention for resident and staff uploads.',
    false
  )
on conflict (setting_key, scope, scope_ref_id) do update
set
  value = excluded.value,
  description = excluded.description,
  is_public = excluded.is_public,
  updated_at = now();

/**
 * DEMO USERS SEEDING
 * These accounts match the demo users in systemData.js for local/development testing.
 * Password for all accounts: mswd-demo-2026
 */

-- 1. Insert into auth.users (Supabase Auth)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'juan.cruz@barbaza.gov.ph',
    crypt('mswd-demo-2026', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"],"role":"super_admin"}',
    '{"full_name":"Juan D. Cruz","role":"super_admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ana.ramos@barbaza.gov.ph',
    crypt('mswd-demo-2026', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"],"role":"mswdo_staff"}',
    '{"full_name":"Ana B. Ramos","role":"mswdo_staff"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'maria.santos@barbaza.gov.ph',
    crypt('mswd-demo-2026', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"],"role":"barangay_secretary"}',
    '{"full_name":"Maria L. Santos","role":"barangay_secretary"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do update
set
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

-- 2. Insert into public.profiles
insert into public.profiles (
  id,
  email,
  display_name,
  first_name,
  last_name,
  is_active
)
values
  ('00000000-0000-0000-0000-000000000001', 'juan.cruz@barbaza.gov.ph', 'Juan D. Cruz', 'Juan', 'Cruz', true),
  ('00000000-0000-0000-0000-000000000002', 'ana.ramos@barbaza.gov.ph', 'Ana B. Ramos', 'Ana', 'Ramos', true),
  ('00000000-0000-0000-0000-000000000003', 'maria.santos@barbaza.gov.ph', 'Maria L. Santos', 'Maria', 'Santos', true)
on conflict (id) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

-- 3. Assign Roles in public.user_roles
insert into public.user_roles (id, user_id, role_id, is_primary)
select
  seed.id,
  seed.user_id,
  r.id,
  true
from (
  values
    ('00000000-0000-0000-0000-100000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'super_admin'),
    ('00000000-0000-0000-0000-100000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'mswdo_staff'),
    ('00000000-0000-0000-0000-100000000003'::uuid, '00000000-0000-0000-0000-000000000003'::uuid, 'barangay_secretary')
) as seed(id, user_id, role_key)
join public.roles r on r.key = seed.role_key
on conflict (id) do update
set
  role_id = excluded.role_id,
  barangay_id = excluded.barangay_id,
  is_primary = excluded.is_primary,
  is_active = true,
  effective_to = null,
  updated_at = now();
