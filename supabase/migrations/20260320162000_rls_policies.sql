alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.barangays enable row level security;
alter table public.households enable row level security;
alter table public.residents enable row level security;
alter table public.household_members enable row level security;
alter table public.land_records enable row level security;
alter table public.social_programs enable row level security;
alter table public.program_requirements enable row level security;
alter table public.applications enable row level security;
alter table public.application_programs enable row level security;
alter table public.application_documents enable row level security;
alter table public.assistance_records enable row level security;
alter table public.eligibility_assessments enable row level security;
alter table public.status_history enable row level security;
alter table public.internal_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
  on public.profiles
  for select
  using (public.can_access_profile(id));

drop policy if exists profiles_insert_policy on public.profiles;
create policy profiles_insert_policy
  on public.profiles
  for insert
  with check (id = auth.uid() or public.has_role('super_admin'));

drop policy if exists profiles_update_policy on public.profiles;
create policy profiles_update_policy
  on public.profiles
  for update
  using (public.can_access_profile(id))
  with check (public.can_access_profile(id));

drop policy if exists roles_select_policy on public.roles;
create policy roles_select_policy
  on public.roles
  for select
  using (auth.role() in ('authenticated', 'service_role'));

drop policy if exists roles_modify_policy on public.roles;
create policy roles_modify_policy
  on public.roles
  for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

drop policy if exists user_roles_select_policy on public.user_roles;
create policy user_roles_select_policy
  on public.user_roles
  for select
  using (user_id = auth.uid() or public.has_role('super_admin'));

drop policy if exists user_roles_modify_policy on public.user_roles;
create policy user_roles_modify_policy
  on public.user_roles
  for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

drop policy if exists barangays_select_policy on public.barangays;
create policy barangays_select_policy
  on public.barangays
  for select
  using (true);

drop policy if exists barangays_modify_policy on public.barangays;
create policy barangays_modify_policy
  on public.barangays
  for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

drop policy if exists households_select_policy on public.households;
create policy households_select_policy
  on public.households
  for select
  using (public.can_access_household(id));

drop policy if exists households_insert_policy on public.households;
create policy households_insert_policy
  on public.households
  for insert
  with check (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
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
    or (public.owns_household(id) and public.same_household_barangay(id, barangay_id))
  );

drop policy if exists households_delete_policy on public.households;
create policy households_delete_policy
  on public.households
  for delete
  using (public.has_role('super_admin'));

drop policy if exists residents_select_policy on public.residents;
create policy residents_select_policy
  on public.residents
  for select
  using (public.can_access_resident(id));

drop policy if exists residents_insert_policy on public.residents;
create policy residents_insert_policy
  on public.residents
  for insert
  with check (
    profile_id = auth.uid()
    or public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
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
  );

drop policy if exists residents_delete_policy on public.residents;
create policy residents_delete_policy
  on public.residents
  for delete
  using (public.has_role('super_admin'));

drop policy if exists household_members_select_policy on public.household_members;
create policy household_members_select_policy
  on public.household_members
  for select
  using (public.can_access_household(household_id));

drop policy if exists household_members_modify_policy on public.household_members;
create policy household_members_modify_policy
  on public.household_members
  for all
  using (public.can_manage_household(household_id))
  with check (public.can_manage_household(household_id));

drop policy if exists land_records_select_policy on public.land_records;
create policy land_records_select_policy
  on public.land_records
  for select
  using (public.can_access_household(household_id));

drop policy if exists land_records_modify_policy on public.land_records;
create policy land_records_modify_policy
  on public.land_records
  for all
  using (public.can_manage_household(household_id))
  with check (public.can_manage_household(household_id));

drop policy if exists social_programs_select_policy on public.social_programs;
create policy social_programs_select_policy
  on public.social_programs
  for select
  using (true);

drop policy if exists social_programs_modify_policy on public.social_programs;
create policy social_programs_modify_policy
  on public.social_programs
  for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

drop policy if exists program_requirements_select_policy on public.program_requirements;
create policy program_requirements_select_policy
  on public.program_requirements
  for select
  using (true);

drop policy if exists program_requirements_modify_policy on public.program_requirements;
create policy program_requirements_modify_policy
  on public.program_requirements
  for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

drop policy if exists applications_select_policy on public.applications;
create policy applications_select_policy
  on public.applications
  for select
  using (public.can_access_application(id));

drop policy if exists applications_insert_policy on public.applications;
create policy applications_insert_policy
  on public.applications
  for insert
  with check (
    public.can_manage_application_submission(resident_id, household_id, barangay_id)
  );

drop policy if exists applications_update_policy on public.applications;
create policy applications_update_policy
  on public.applications
  for update
  using (public.can_prepare_application(id))
  with check (public.can_prepare_application(id));

drop policy if exists applications_delete_policy on public.applications;
create policy applications_delete_policy
  on public.applications
  for delete
  using (public.has_role('super_admin'));

drop policy if exists application_programs_select_policy on public.application_programs;
create policy application_programs_select_policy
  on public.application_programs
  for select
  using (public.can_access_application(application_id));

drop policy if exists application_programs_insert_policy on public.application_programs;
create policy application_programs_insert_policy
  on public.application_programs
  for insert
  with check (public.can_prepare_application(application_id));

drop policy if exists application_programs_update_policy on public.application_programs;
create policy application_programs_update_policy
  on public.application_programs
  for update
  using (public.can_prepare_application(application_id))
  with check (public.can_prepare_application(application_id));

drop policy if exists application_programs_delete_policy on public.application_programs;
create policy application_programs_delete_policy
  on public.application_programs
  for delete
  using (public.can_prepare_application(application_id));

drop policy if exists application_documents_select_policy on public.application_documents;
create policy application_documents_select_policy
  on public.application_documents
  for select
  using (public.can_access_application(application_id));

drop policy if exists application_documents_insert_policy on public.application_documents;
create policy application_documents_insert_policy
  on public.application_documents
  for insert
  with check (public.can_manage_application_documents(application_id));

drop policy if exists application_documents_update_policy on public.application_documents;
create policy application_documents_update_policy
  on public.application_documents
  for update
  using (public.can_manage_application_documents(application_id))
  with check (public.can_manage_application_documents(application_id));

drop policy if exists application_documents_delete_policy on public.application_documents;
create policy application_documents_delete_policy
  on public.application_documents
  for delete
  using (public.can_manage_application_documents(application_id));

drop policy if exists assistance_records_select_policy on public.assistance_records;
create policy assistance_records_select_policy
  on public.assistance_records
  for select
  using (public.can_access_household(household_id));

drop policy if exists assistance_records_modify_policy on public.assistance_records;
create policy assistance_records_modify_policy
  on public.assistance_records
  for all
  using (public.can_review_application(application_id) or public.can_access_barangay(barangay_id))
  with check (public.can_review_application(application_id) or public.can_access_barangay(barangay_id));

drop policy if exists eligibility_assessments_select_policy on public.eligibility_assessments;
create policy eligibility_assessments_select_policy
  on public.eligibility_assessments
  for select
  using (public.can_access_application(application_id));

drop policy if exists eligibility_assessments_modify_policy on public.eligibility_assessments;
create policy eligibility_assessments_modify_policy
  on public.eligibility_assessments
  for all
  using (public.can_review_application(application_id))
  with check (public.can_review_application(application_id));

drop policy if exists status_history_select_policy on public.status_history;
create policy status_history_select_policy
  on public.status_history
  for select
  using (public.can_access_application(application_id));

drop policy if exists status_history_insert_policy on public.status_history;
create policy status_history_insert_policy
  on public.status_history
  for insert
  with check (public.can_review_application(application_id) or public.owns_application(application_id));

drop policy if exists internal_notes_select_policy on public.internal_notes;
create policy internal_notes_select_policy
  on public.internal_notes
  for select
  using (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
  );

drop policy if exists internal_notes_modify_policy on public.internal_notes;
create policy internal_notes_modify_policy
  on public.internal_notes
  for all
  using (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
  )
  with check (
    public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff', barangay_id)
  );

drop policy if exists notifications_select_policy on public.notifications;
create policy notifications_select_policy
  on public.notifications
  for select
  using (user_id = auth.uid() or public.has_role('super_admin'));

drop policy if exists notifications_insert_policy on public.notifications;
create policy notifications_insert_policy
  on public.notifications
  for insert
  with check (
    user_id = auth.uid()
    or public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or public.has_role('barangay_staff')
  );

drop policy if exists notifications_update_policy on public.notifications;
create policy notifications_update_policy
  on public.notifications
  for update
  using (user_id = auth.uid() or public.has_role('super_admin'))
  with check (user_id = auth.uid() or public.has_role('super_admin'));

drop policy if exists audit_logs_select_policy on public.audit_logs;
create policy audit_logs_select_policy
  on public.audit_logs
  for select
  using (public.has_role('super_admin'));

drop policy if exists settings_select_policy on public.settings;
create policy settings_select_policy
  on public.settings
  for select
  using (
    is_public
    or public.has_role('super_admin')
    or public.has_role('mswdo_staff')
    or (scope = 'barangay' and public.can_access_barangay(scope_ref_id))
    or (scope = 'user' and scope_ref_id = auth.uid())
  );

drop policy if exists settings_modify_policy on public.settings;
create policy settings_modify_policy
  on public.settings
  for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));
