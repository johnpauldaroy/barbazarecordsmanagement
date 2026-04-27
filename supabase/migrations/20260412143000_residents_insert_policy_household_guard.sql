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
    or public.has_role('barangay_staff', target_barangay)
    or public.has_role('barangay_secretary', target_barangay)
$$;

drop policy if exists residents_insert_policy on public.residents;
create policy residents_insert_policy
  on public.residents
  for insert
  with check (
    profile_id = auth.uid()
    or public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
    or exists (
      select 1
      from public.households h
      where h.id = household_id
        and (
          public.has_role('barangay_staff', h.barangay_id)
          or public.has_role('barangay_secretary', h.barangay_id)
        )
    )
  );
