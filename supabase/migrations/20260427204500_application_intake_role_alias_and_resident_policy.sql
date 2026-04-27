-- Final application-intake RLS compatibility pass.
-- This keeps existing canonical role names, but also recognizes common legacy
-- live-project keys such as admin, staff, mswd_staff, and barangay.

create or replace function public.has_role(role_key text, target_barangay uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select case
      when lower(btrim(coalesce(role_key, ''))) in ('super_admin', 'super admin', 'admin', 'administrator')
        then array['super_admin', 'super admin', 'admin', 'administrator']::text[]
      when lower(btrim(coalesce(role_key, ''))) in ('mswdo_staff', 'mswdo staff', 'mswd_staff', 'mswd staff', 'mswd processor', 'staff')
        then array['mswdo_staff', 'mswdo staff', 'mswd_staff', 'mswd staff', 'mswd processor', 'staff']::text[]
      when lower(btrim(coalesce(role_key, ''))) in ('mswdo_approver', 'mswdo approver', 'mswd supervisor', 'approver')
        then array['mswdo_approver', 'mswdo approver', 'mswd supervisor', 'approver']::text[]
      when lower(btrim(coalesce(role_key, ''))) in ('barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user')
        then array['barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user']::text[]
      else array[lower(btrim(coalesce(role_key, '')))]::text[]
    end as role_keys
  )
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    cross join normalized n
    where ur.user_id = auth.uid()
      and ur.is_active
      and ur.effective_from <= now()
      and (ur.effective_to is null or ur.effective_to >= now())
      and lower(btrim(r.key)) = any (n.role_keys)
      and (
        target_barangay is null
        or ur.barangay_id is null
        or ur.barangay_id = target_barangay
        or (
          lower(btrim(r.key)) = any (
            array['barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user']::text[]
          )
          and p.default_barangay_id = target_barangay
        )
      )
  );
$$;

create or replace function public.can_access_barangay(target_barangay uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role('super_admin', target_barangay)
    or public.has_role('mswdo_staff', target_barangay)
    or public.has_role('mswdo_approver', target_barangay)
    or public.has_role('barangay_staff', target_barangay)
    or public.has_role('barangay_secretary', target_barangay)
$$;

drop policy if exists residents_insert_policy on public.residents;
create policy residents_insert_policy
  on public.residents
  for insert
  with check (
    profile_id = auth.uid()
    or public.can_access_barangay(barangay_id)
    or exists (
      select 1
      from public.households h
      where h.id = household_id
        and public.can_access_barangay(h.barangay_id)
    )
  );

drop policy if exists residents_update_policy on public.residents;
create policy residents_update_policy
  on public.residents
  for update
  using (public.can_manage_resident(id))
  with check (
    public.owns_resident(id)
    or public.can_access_barangay(barangay_id)
  );

with scoped_default_roles as (
  select
    ur.id,
    p.default_barangay_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where ur.barangay_id is null
    and p.default_barangay_id is not null
    and lower(btrim(r.key)) = any (
      array['barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user']::text[]
    )
    and not exists (
      select 1
      from public.user_roles existing
      where existing.user_id = ur.user_id
        and existing.role_id = ur.role_id
        and existing.barangay_id = p.default_barangay_id
    )
)
update public.user_roles ur
set
  barangay_id = scoped_default_roles.default_barangay_id,
  updated_at = now()
from scoped_default_roles
where ur.id = scoped_default_roles.id;
