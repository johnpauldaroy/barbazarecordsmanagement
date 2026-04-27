-- Some live projects may have a legacy role key named "barangay".
-- Treat it as a barangay-scoped staff role for RLS checks.

create or replace function public.has_role(role_key text, target_barangay uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select case
      when lower(btrim(coalesce(role_key, ''))) in ('barangay', 'barangay_staff', 'barangay_secretary')
        then array['barangay', 'barangay_staff', 'barangay_secretary']::text[]
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
      and lower(r.key) = any (n.role_keys)
      and (
        target_barangay is null
        or ur.barangay_id = target_barangay
        or (
          ur.barangay_id is null
          and lower(r.key) not in ('barangay', 'barangay_staff', 'barangay_secretary')
        )
        or (
          ur.barangay_id is null
          and lower(r.key) in ('barangay', 'barangay_staff', 'barangay_secretary')
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
    or public.has_role('barangay', target_barangay)
    or public.has_role('barangay_staff', target_barangay)
    or public.has_role('barangay_secretary', target_barangay)
$$;

with scoped_default_roles as (
  select
    ur.id,
    p.default_barangay_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where ur.barangay_id is null
    and p.default_barangay_id is not null
    and lower(r.key) in ('barangay', 'barangay_staff', 'barangay_secretary')
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
