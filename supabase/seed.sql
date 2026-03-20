insert into public.barangays (code, name, district)
values
  ('POBLACION', 'Poblacion', 'Central'),
  ('MAYHA', 'Mayha', 'North'),
  ('BADIANGAN', 'Badiangan', 'East'),
  ('TOROCADAN', 'Torocadan', 'South')
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
