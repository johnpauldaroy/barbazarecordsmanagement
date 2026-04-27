-- Server-side resident creation for application intake. This avoids fragile
-- client-side resident inserts while still enforcing barangay access.

create or replace function public.create_resident_for_intake(
  target_household_id uuid,
  target_barangay_id uuid,
  target_first_name text,
  target_middle_name text default null,
  target_last_name text default null,
  target_suffix_name text default null,
  target_is_head boolean default false
)
returns table (
  id uuid,
  first_name text,
  middle_name text,
  last_name text,
  suffix_name text,
  household_id uuid,
  barangay_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_barangay_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to add residents.';
  end if;

  select h.barangay_id
    into v_household_barangay_id
  from public.households h
  where h.id = target_household_id
    and h.archived_at is null;

  if v_household_barangay_id is null then
    raise exception 'Household was not found.';
  end if;

  if v_household_barangay_id <> target_barangay_id then
    raise exception 'Resident barangay must match the household barangay.';
  end if;

  if not public.can_access_barangay(v_household_barangay_id) then
    raise exception 'Your account cannot add residents for the selected barangay.';
  end if;

  return query
  insert into public.residents (
    household_id,
    barangay_id,
    first_name,
    middle_name,
    last_name,
    suffix_name,
    is_head
  )
  values (
    target_household_id,
    target_barangay_id,
    nullif(btrim(target_first_name), ''),
    nullif(btrim(target_middle_name), ''),
    nullif(btrim(target_last_name), ''),
    nullif(btrim(target_suffix_name), ''),
    coalesce(target_is_head, false)
  )
  returning
    residents.id,
    residents.first_name,
    residents.middle_name,
    residents.last_name,
    residents.suffix_name,
    residents.household_id,
    residents.barangay_id;
end;
$$;

grant execute on function public.create_resident_for_intake(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  boolean
) to authenticated;
