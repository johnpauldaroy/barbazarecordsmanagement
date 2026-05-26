insert into public.roles (key, name, description)
values (
  'barangay_secretary',
  'Barangay Secretary',
  'Manage households, add applicants, view status, social programs, and land info.'
)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
