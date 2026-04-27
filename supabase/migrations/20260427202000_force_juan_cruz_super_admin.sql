-- Ensure the demo administrator account resolves as Super Admin in live projects.
do $$
declare
  v_user_id uuid;
  v_super_admin_role_id uuid;
begin
  select id
    into v_user_id
  from auth.users
  where lower(email) = 'juan.cruz@barbaza.gov.ph'
  limit 1;

  select id
    into v_super_admin_role_id
  from public.roles
  where key = 'super_admin'
  limit 1;

  if v_user_id is null or v_super_admin_role_id is null then
    return;
  end if;

  update auth.users
  set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || '{"role":"super_admin"}'::jsonb,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || '{"full_name":"Juan D. Cruz","role":"super_admin"}'::jsonb,
    updated_at = now()
  where id = v_user_id;

  insert into public.profiles (
    id,
    email,
    display_name,
    first_name,
    last_name,
    is_active
  )
  values (
    v_user_id,
    'juan.cruz@barbaza.gov.ph',
    'Juan D. Cruz',
    'Juan',
    'Cruz',
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    is_active = true,
    updated_at = now();

  update public.user_roles
  set
    is_primary = false,
    is_active = false,
    effective_to = coalesce(effective_to, now()),
    updated_at = now()
  where user_id = v_user_id
    and role_id <> v_super_admin_role_id
    and is_active = true;

  insert into public.user_roles (
    user_id,
    role_id,
    barangay_id,
    is_primary,
    is_active,
    effective_from,
    effective_to
  )
  values (
    v_user_id,
    v_super_admin_role_id,
    null,
    true,
    true,
    now(),
    null
  )
  on conflict (user_id, role_id)
  where barangay_id is null
  do update
  set
    barangay_id = null,
    is_primary = true,
    is_active = true,
    effective_to = null,
    updated_at = now();
end $$;
