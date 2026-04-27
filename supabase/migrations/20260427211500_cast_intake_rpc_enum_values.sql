-- Cast text RPC parameters to database enum types used by intake tables.

create or replace function public.create_application_for_intake(
  target_resident_id uuid,
  target_household_id uuid,
  target_barangay_id uuid,
  target_current_status text default 'submitted',
  target_review_stage text default 'intake',
  target_intake_channel text default 'mswd_portal'
)
returns table (
  id uuid,
  application_no text,
  submitted_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to create applications.';
  end if;

  if not public.can_manage_application_submission(
    target_resident_id,
    target_household_id,
    target_barangay_id
  ) then
    raise exception 'Your account cannot create applications for the selected household and barangay.';
  end if;

  return query
  insert into public.applications (
    resident_id,
    household_id,
    barangay_id,
    intake_channel,
    current_status,
    review_stage
  )
  values (
    target_resident_id,
    target_household_id,
    target_barangay_id,
    coalesce(nullif(btrim(target_intake_channel), ''), 'mswd_portal'),
    coalesce(nullif(btrim(target_current_status), ''), 'submitted')::public.application_status,
    coalesce(nullif(btrim(target_review_stage), ''), 'intake')
  )
  returning
    applications.id,
    applications.application_no,
    applications.submitted_at,
    applications.created_at;
end;
$$;

grant execute on function public.create_application_for_intake(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) to authenticated;

create or replace function public.link_application_program_for_intake(
  target_application_id uuid,
  target_program_id uuid,
  target_decision_status text default 'submitted'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to link programs.';
  end if;

  if not public.can_prepare_application(target_application_id) then
    raise exception 'Your account cannot update programs for this application.';
  end if;

  insert into public.application_programs (
    application_id,
    program_id,
    decision_status
  )
  values (
    target_application_id,
    target_program_id,
    coalesce(nullif(btrim(target_decision_status), ''), 'submitted')::public.application_status
  )
  on conflict (application_id, program_id) do update
  set
    decision_status = excluded.decision_status,
    updated_at = now();
end;
$$;

grant execute on function public.link_application_program_for_intake(uuid, uuid, text) to authenticated;

create or replace function public.add_application_document_for_intake(
  target_application_id uuid,
  target_requirement_id uuid default null,
  target_resident_id uuid default null,
  target_object_path text default null,
  target_file_name text default null,
  target_mime_type text default null,
  target_file_size_bytes bigint default null,
  target_status text default 'uploaded'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to add documents.';
  end if;

  if not public.can_manage_application_documents(target_application_id) then
    raise exception 'Your account cannot add documents for this application.';
  end if;

  insert into public.application_documents (
    application_id,
    requirement_id,
    resident_id,
    object_path,
    file_name,
    mime_type,
    file_size_bytes,
    status
  )
  values (
    target_application_id,
    target_requirement_id,
    target_resident_id,
    btrim(target_object_path),
    btrim(target_file_name),
    nullif(btrim(target_mime_type), ''),
    target_file_size_bytes,
    coalesce(nullif(btrim(target_status), ''), 'uploaded')::public.document_status
  );
end;
$$;

grant execute on function public.add_application_document_for_intake(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text
) to authenticated;

select pg_notify('pgrst', 'reload schema');
