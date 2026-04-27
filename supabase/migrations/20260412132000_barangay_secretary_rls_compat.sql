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

drop policy if exists households_insert_policy on public.households;
create policy households_insert_policy
  on public.households
  for insert
  with check (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
    or public.has_role('resident')
  );

drop policy if exists households_update_policy on public.households;
create policy households_update_policy
  on public.households
  for update
  using (public.can_manage_household(id))
  with check (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
    or (public.owns_household(id) and public.same_household_barangay(id, barangay_id))
  );

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
  );

drop policy if exists residents_update_policy on public.residents;
create policy residents_update_policy
  on public.residents
  for update
  using (public.can_manage_resident(id))
  with check (
    public.owns_resident(id)
    or public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
  );

drop policy if exists internal_notes_select_policy on public.internal_notes;
create policy internal_notes_select_policy
  on public.internal_notes
  for select
  using (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
  );

drop policy if exists internal_notes_modify_policy on public.internal_notes;
create policy internal_notes_modify_policy
  on public.internal_notes
  for all
  using (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
  )
  with check (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
    or public.has_role('barangay_secretary', barangay_id)
  );

drop policy if exists notifications_insert_policy on public.notifications;
create policy notifications_insert_policy
  on public.notifications
  for insert
  with check (
    user_id = auth.uid()
    or public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff')
    or public.has_role('barangay_secretary')
  );
