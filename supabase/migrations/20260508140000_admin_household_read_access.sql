-- Grant admin read-only access to household records.
-- Admin can view all households across all barangays but cannot add, edit, or delete.

create or replace function public.can_access_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households h
    where h.id = target_household_id
      and (
        public.has_role('admin')
        or public.has_role('barangay_secretary', h.barangay_id)
      )
  )
$$;

select pg_notify('pgrst', 'reload schema');
