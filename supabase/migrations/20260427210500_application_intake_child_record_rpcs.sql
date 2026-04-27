-- Child-record helpers for application intake. These mirror the client-side
-- inserts after the application row is created.

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
    coalesce(nullif(btrim(target_decision_status), ''), 'submitted')
  )
  on conflict (application_id, program_id) do update
  set
    decision_status = excluded.decision_status,
    updated_at = now();
end;
$$;

grant execute on function public.link_application_program_for_intake(uuid, uuid, text) to authenticated;

create or replace function public.add_internal_note_for_intake(
  target_application_id uuid,
  target_note_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to add notes.';
  end if;

  if not public.can_edit_application(target_application_id) then
    raise exception 'Your account cannot add notes for this application.';
  end if;

  insert into public.internal_notes (
    application_id,
    visibility,
    note_text
  )
  values (
    target_application_id,
    'internal',
    btrim(target_note_text)
  );
end;
$$;

grant execute on function public.add_internal_note_for_intake(uuid, text) to authenticated;

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
    coalesce(nullif(btrim(target_status), ''), 'uploaded')
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
