create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_audit_actor()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.created_by is null and auth.uid() is not null then
    new.created_by = auth.uid();
  end if;

  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.assign_household_code()
returns trigger
language plpgsql
as $$
begin
  if new.household_code is null or btrim(new.household_code) = '' then
    new.household_code := 'HH-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.household_code_seq')::text, 5, '0');
  end if;

  return new;
end;
$$;

create or replace function public.assign_application_number()
returns trigger
language plpgsql
as $$
begin
  if new.application_no is null or btrim(new.application_no) = '' then
    new.application_no := 'APP-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.application_number_seq')::text, 5, '0');
  end if;

  if new.submitted_by is null and auth.uid() is not null then
    new.submitted_by = auth.uid();
  end if;

  if new.current_status <> 'draft' and new.submitted_at is null then
    new.submitted_at = now();
  end if;

  return new;
end;
$$;

create or replace function public.sync_resident_context()
returns trigger
language plpgsql
as $$
declare
  v_barangay_id uuid;
begin
  select barangay_id
    into v_barangay_id
  from public.households
  where id = new.household_id;

  if v_barangay_id is null then
    raise exception 'Resident must belong to an existing household';
  end if;

  new.barangay_id = v_barangay_id;
  new.is_senior = coalesce(new.birth_date <= (current_date - interval '60 years'), false);

  return new;
end;
$$;

create or replace function public.validate_household_member()
returns trigger
language plpgsql
as $$
declare
  v_household_id uuid;
begin
  select household_id
    into v_household_id
  from public.residents
  where id = new.resident_id;

  if v_household_id is null then
    raise exception 'Resident does not exist';
  end if;

  if v_household_id <> new.household_id then
    raise exception 'Resident and household membership must point to the same household';
  end if;

  return new;
end;
$$;

create or replace function public.sync_land_record_context()
returns trigger
language plpgsql
as $$
declare
  v_barangay_id uuid;
begin
  select barangay_id
    into v_barangay_id
  from public.households
  where id = new.household_id;

  if v_barangay_id is null then
    raise exception 'Land record must belong to an existing household';
  end if;

  new.barangay_id = v_barangay_id;
  return new;
end;
$$;

create or replace function public.validate_application_context()
returns trigger
language plpgsql
as $$
declare
  v_household_id uuid;
  v_barangay_id uuid;
begin
  select r.household_id, r.barangay_id
    into v_household_id, v_barangay_id
  from public.residents r
  where r.id = new.resident_id;

  if v_household_id is null then
    raise exception 'Application must reference an existing resident';
  end if;

  if new.household_id <> v_household_id then
    raise exception 'Application household must match the resident household';
  end if;

  new.barangay_id = v_barangay_id;

  if new.current_status <> 'draft' and new.submitted_at is null then
    new.submitted_at = now();
  end if;

  return new;
end;
$$;

create or replace function public.sync_assistance_context()
returns trigger
language plpgsql
as $$
declare
  v_household_barangay uuid;
  v_resident_household uuid;
begin
  select barangay_id
    into v_household_barangay
  from public.households
  where id = new.household_id;

  if v_household_barangay is null then
    raise exception 'Assistance record must reference an existing household';
  end if;

  new.barangay_id = v_household_barangay;

  if new.resident_id is not null then
    select household_id
      into v_resident_household
    from public.residents
    where id = new.resident_id;

    if v_resident_household <> new.household_id then
      raise exception 'Resident must belong to the same household as the assistance record';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_internal_note_context()
returns trigger
language plpgsql
as $$
declare
  v_barangay_id uuid;
begin
  if new.application_id is not null then
    select barangay_id into v_barangay_id from public.applications where id = new.application_id;
  elsif new.household_id is not null then
    select barangay_id into v_barangay_id from public.households where id = new.household_id;
  elsif new.resident_id is not null then
    select barangay_id into v_barangay_id from public.residents where id = new.resident_id;
  end if;

  new.barangay_id = coalesce(new.barangay_id, v_barangay_id);
  return new;
end;
$$;

create or replace function public.current_actor_role_id(target_barangay uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.role_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
    and ur.is_active
    and ur.effective_from <= now()
    and (ur.effective_to is null or ur.effective_to >= now())
    and (
      target_barangay is null
      or ur.barangay_id is null
      or ur.barangay_id = target_barangay
    )
  order by ur.is_primary desc, r.key
  limit 1
$$;

create or replace function public.has_role(role_key text, target_barangay uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.is_active
      and ur.effective_from <= now()
      and (ur.effective_to is null or ur.effective_to >= now())
      and r.key = role_key
      and (
        target_barangay is null
        or ur.barangay_id is null
        or ur.barangay_id = target_barangay
      )
  )
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
    or public.has_role('barangay_staff', target_barangay)
$$;

create or replace function public.household_matches_resident(target_household_id uuid, target_resident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residents r
    where r.id = target_resident_id
      and r.household_id = target_household_id
  )
$$;

create or replace function public.owns_resident(target_resident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residents r
    where r.id = target_resident_id
      and r.profile_id = auth.uid()
      and r.archived_at is null
  )
$$;

create or replace function public.owns_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residents r
    where r.household_id = target_household_id
      and r.profile_id = auth.uid()
      and r.archived_at is null
  )
$$;

create or replace function public.can_access_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.owns_household(target_household_id)
    or exists (
      select 1
      from public.households h
      where h.id = target_household_id
        and public.can_access_barangay(h.barangay_id)
    )
$$;

create or replace function public.can_manage_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_household(target_household_id)
$$;

create or replace function public.same_household_barangay(target_household_id uuid, candidate_barangay_id uuid)
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
      and h.barangay_id = candidate_barangay_id
  )
$$;

create or replace function public.can_access_resident(target_resident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.owns_resident(target_resident_id)
    or exists (
      select 1
      from public.residents target
      join public.residents self on self.household_id = target.household_id
      where target.id = target_resident_id
        and self.profile_id = auth.uid()
        and self.archived_at is null
    )
    or exists (
      select 1
      from public.residents r
      where r.id = target_resident_id
        and public.can_access_barangay(r.barangay_id)
    )
$$;

create or replace function public.can_manage_resident(target_resident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.owns_resident(target_resident_id)
    or exists (
      select 1
      from public.residents r
      where r.id = target_resident_id
        and public.can_access_barangay(r.barangay_id)
    )
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile_id = auth.uid()
    or exists (
      select 1
      from public.residents r
      where r.profile_id = target_profile_id
        and public.can_access_resident(r.id)
    )
$$;

create or replace function public.owns_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.residents r on r.id = a.resident_id
    where a.id = target_application_id
      and (
        r.profile_id = auth.uid()
        or a.submitted_by = auth.uid()
      )
  )
$$;

create or replace function public.can_access_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.owns_application(target_application_id)
    or exists (
      select 1
      from public.applications a
      where a.id = target_application_id
        and public.can_access_household(a.household_id)
    )
$$;

create or replace function public.can_review_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = target_application_id
      and public.can_access_barangay(a.barangay_id)
  )
$$;

create or replace function public.can_edit_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = target_application_id
      and (
        public.can_review_application(a.id)
        or (
          public.owns_application(a.id)
          and a.current_status in ('draft', 'submitted', 'needs_more_info')
        )
      )
  )
$$;

create or replace function public.can_prepare_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = target_application_id
      and (
        public.can_review_application(a.id)
        or (
          public.owns_application(a.id)
          and a.current_status in ('draft', 'needs_more_info')
        )
      )
  )
$$;

create or replace function public.can_manage_application_documents(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_edit_application(target_application_id)
$$;

create or replace function public.can_manage_application_submission(
  target_resident_id uuid,
  target_household_id uuid,
  target_barangay_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.household_matches_resident(target_household_id, target_resident_id)
    and (
      public.owns_resident(target_resident_id)
      or public.can_access_barangay(target_barangay_id)
    )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    middle_name,
    last_name,
    display_name,
    phone_number,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'middle_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = now();

  insert into public.user_roles (user_id, role_id, is_primary)
  select new.id, r.id, true
  from public.roles r
  where r.key = 'resident'
    and not exists (
      select 1
      from public.user_roles ur
      where ur.user_id = new.id
        and ur.role_id = r.id
        and ur.barangay_id is null
    );

  return new;
end;
$$;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      phone_number = coalesce(nullif(new.raw_user_meta_data ->> 'phone_number', ''), phone_number),
      display_name = coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), display_name),
      last_sign_in_at = now(),
      updated_at = now()
  where id = new.id;

  return new;
end;
$$;

create or replace function public.track_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  v_role_id := public.current_actor_role_id(
    case
      when tg_op = 'INSERT' then new.barangay_id
      else coalesce(new.barangay_id, old.barangay_id)
    end
  );

  if tg_op = 'INSERT' then
    insert into public.status_history (
      application_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role_id,
      remarks,
      metadata
    )
    values (
      new.id,
      null,
      new.current_status,
      coalesce(new.updated_by, new.created_by, auth.uid()),
      v_role_id,
      null,
      jsonb_build_object('source', 'insert')
    );

    return new;
  end if;

  if new.current_status is distinct from old.current_status then
    insert into public.status_history (
      application_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role_id,
      remarks,
      metadata
    )
    values (
      new.id,
      old.current_status,
      new.current_status,
      coalesce(new.updated_by, auth.uid()),
      v_role_id,
      null,
      jsonb_build_object('source', 'update')
    );
  end if;

  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_record_id uuid;
  v_barangay_id uuid;
begin
  v_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  v_record_id := coalesce(public.safe_uuid(v_new ->> 'id'), public.safe_uuid(v_old ->> 'id'));
  v_barangay_id := coalesce(public.safe_uuid(v_new ->> 'barangay_id'), public.safe_uuid(v_old ->> 'barangay_id'));

  insert into public.audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    barangay_id,
    old_data,
    new_data,
    metadata
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_record_id,
    v_barangay_id,
    case when tg_op in ('UPDATE', 'DELETE') then v_old else null end,
    case when tg_op in ('INSERT', 'UPDATE') then v_new else null end,
    jsonb_build_object('trigger', tg_name)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row
  execute function public.sync_profile_from_auth_user();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'barangays',
    'roles',
    'user_roles',
    'households',
    'residents',
    'household_members',
    'land_records',
    'social_programs',
    'program_requirements',
    'applications',
    'application_programs',
    'application_documents',
    'assistance_records',
    'eligibility_assessments',
    'internal_notes',
    'notifications',
    'settings'
  ]
  loop
    execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', v_table);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', v_table);
  end loop;
end $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'barangays',
    'user_roles',
    'households',
    'residents',
    'household_members',
    'land_records',
    'social_programs',
    'program_requirements',
    'applications',
    'application_programs',
    'application_documents',
    'assistance_records',
    'eligibility_assessments',
    'internal_notes',
    'notifications',
    'settings'
  ]
  loop
    execute format('drop trigger if exists %1$s_set_audit_actor on public.%1$s', v_table);
    execute format('create trigger %1$s_set_audit_actor before insert or update on public.%1$s for each row execute function public.set_audit_actor()', v_table);
  end loop;
end $$;

drop trigger if exists households_assign_code on public.households;
create trigger households_assign_code
  before insert on public.households
  for each row
  execute function public.assign_household_code();

drop trigger if exists residents_sync_context on public.residents;
create trigger residents_sync_context
  before insert or update of household_id, birth_date on public.residents
  for each row
  execute function public.sync_resident_context();

drop trigger if exists household_members_validate_context on public.household_members;
create trigger household_members_validate_context
  before insert or update of household_id, resident_id on public.household_members
  for each row
  execute function public.validate_household_member();

drop trigger if exists land_records_sync_context on public.land_records;
create trigger land_records_sync_context
  before insert or update of household_id on public.land_records
  for each row
  execute function public.sync_land_record_context();

drop trigger if exists applications_assign_number on public.applications;
create trigger applications_assign_number
  before insert on public.applications
  for each row
  execute function public.assign_application_number();

drop trigger if exists applications_validate_context on public.applications;
create trigger applications_validate_context
  before insert or update of resident_id, household_id, current_status on public.applications
  for each row
  execute function public.validate_application_context();

drop trigger if exists applications_track_status on public.applications;
create trigger applications_track_status
  after insert or update of current_status on public.applications
  for each row
  execute function public.track_application_status();

drop trigger if exists assistance_records_sync_context on public.assistance_records;
create trigger assistance_records_sync_context
  before insert or update of household_id, resident_id on public.assistance_records
  for each row
  execute function public.sync_assistance_context();

drop trigger if exists internal_notes_sync_context on public.internal_notes;
create trigger internal_notes_sync_context
  before insert or update of application_id, household_id, resident_id, barangay_id on public.internal_notes
  for each row
  execute function public.sync_internal_note_context();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'user_roles',
    'barangays',
    'households',
    'residents',
    'land_records',
    'social_programs',
    'program_requirements',
    'applications',
    'application_programs',
    'application_documents',
    'assistance_records',
    'eligibility_assessments',
    'internal_notes',
    'notifications',
    'settings'
  ]
  loop
    execute format('drop trigger if exists %1$s_write_audit_log on public.%1$s', v_table);
    execute format('create trigger %1$s_write_audit_log after insert or update or delete on public.%1$s for each row execute function public.write_audit_log()', v_table);
  end loop;
end $$;
