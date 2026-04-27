-- Allow barangay-scoped staff whose role row is missing barangay_id to use
-- their profile default barangay for target-barangay RLS checks.

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

-- Convert global barangay-scoped role rows to the user's default barangay
-- when doing so will not collide with an existing concrete assignment.
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

-- Keep the resident insert policy aligned with can_access_barangay so the
-- fallback above is used during application intake.
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
