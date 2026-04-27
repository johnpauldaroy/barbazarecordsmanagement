drop function if exists public.portal_user_directory();
create or replace function public.portal_user_directory()
returns table (
  id uuid,
  display_name text,
  email citext,
  is_active boolean,
  last_sign_in_at timestamptz,
  role_key text,
  role_name text,
  barangay_id uuid,
  barangay_code text,
  barangay_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.email,
    p.is_active,
    p.last_sign_in_at,
    assigned_role.role_key,
    assigned_role.role_name,
    assigned_role.barangay_id,
    assigned_role.barangay_code,
    assigned_role.barangay_name
  from public.profiles p
  left join lateral (
    select
      r.key as role_key,
      r.name as role_name,
      b.id as barangay_id,
      b.code as barangay_code,
      b.name as barangay_name
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    left join public.barangays b on b.id = ur.barangay_id
    where ur.user_id = p.id
    order by ur.is_primary desc, ur.is_active desc, ur.updated_at desc
    limit 1
  ) assigned_role on true
  where
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or p.id = auth.uid()
  order by p.display_name nulls last, p.email nulls last;
$$;

drop function if exists public.update_portal_user(uuid, text, text, boolean);
create or replace function public.update_portal_user(
  target_user_id uuid,
  target_display_name text,
  target_role_key text,
  target_is_active boolean,
  target_barangay_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_existing_role_id uuid;
  v_role_requires_barangay boolean;
  v_assigned_barangay_id uuid;
begin
  if not public.has_role('super_admin') then
    raise exception 'Only super admins can update portal users.';
  end if;

  select id
    into v_role_id
  from public.roles
  where key = target_role_key;

  if v_role_id is null then
    raise exception 'Role "%" was not found.', target_role_key;
  end if;

  v_role_requires_barangay := target_role_key in ('barangay_secretary', 'barangay_staff');
  v_assigned_barangay_id := case when v_role_requires_barangay then target_barangay_id else null end;

  if v_role_requires_barangay and v_assigned_barangay_id is null then
    raise exception 'Barangay assignment is required for role "%".', target_role_key;
  end if;

  if v_assigned_barangay_id is not null
    and not exists (select 1 from public.barangays b where b.id = v_assigned_barangay_id)
  then
    raise exception 'Barangay "%" was not found.', v_assigned_barangay_id;
  end if;

  update public.profiles
  set
    display_name = nullif(btrim(target_display_name), ''),
    default_barangay_id = case when v_role_requires_barangay then v_assigned_barangay_id else null end,
    is_active = target_is_active,
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Profile "%" was not found.', target_user_id;
  end if;

  update public.user_roles
  set
    is_primary = false,
    is_active = false,
    effective_to = coalesce(effective_to, now()),
    updated_at = now()
  where user_id = target_user_id;

  select id
    into v_existing_role_id
  from public.user_roles
  where user_id = target_user_id
    and role_id = v_role_id
    and (
      (barangay_id is null and v_assigned_barangay_id is null)
      or barangay_id = v_assigned_barangay_id
    )
  limit 1;

  if v_existing_role_id is not null then
    update public.user_roles
    set
      is_primary = true,
      is_active = target_is_active,
      effective_from = coalesce(effective_from, now()),
      effective_to = case when target_is_active then null else now() end,
      updated_at = now()
    where id = v_existing_role_id;
  else
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
      target_user_id,
      v_role_id,
      v_assigned_barangay_id,
      true,
      target_is_active,
      now(),
      case when target_is_active then null else now() end
    );
  end if;
end;
$$;

drop function if exists public.deactivate_portal_user(uuid);
create or replace function public.deactivate_portal_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_key text;
  v_barangay_id uuid;
begin
  select
    r.key,
    ur.barangay_id
  into
    v_role_key,
    v_barangay_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = target_user_id
  order by ur.is_primary desc, ur.is_active desc, ur.updated_at desc
  limit 1;

  perform public.update_portal_user(
    target_user_id,
    coalesce((select p.display_name from public.profiles p where p.id = target_user_id), ''),
    coalesce(v_role_key, 'resident'),
    false,
    v_barangay_id
  );
end;
$$;

grant execute on function public.portal_user_directory() to authenticated;
grant execute on function public.update_portal_user(uuid, text, text, boolean, uuid) to authenticated;
grant execute on function public.deactivate_portal_user(uuid) to authenticated;
