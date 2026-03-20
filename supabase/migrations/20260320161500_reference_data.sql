insert into public.roles (key, name, description)
values
  ('super_admin', 'Super Admin', 'Full governance access for users, roles, settings, and audit logs.'),
  ('mswdo_staff', 'MSWDO Staff', 'Municipal-level access across barangays for intake review and analytics.'),
  ('barangay_staff', 'Barangay Staff', 'Barangay-scoped access for household maintenance and assisted applications.'),
  ('resident', 'Resident', 'Self-service resident access for profile, household linkage, applications, and notifications.')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
