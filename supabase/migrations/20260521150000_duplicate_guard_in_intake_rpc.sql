-- Adds a duplicate-application guard to link_application_program_for_intake.
-- Before linking a program to an application, the RPC checks whether the
-- household already has a non-rejected/cancelled application for that program
-- (90-day rolling window for AICS; same calendar year for all programs).
-- Raises P0002 if a duplicate is found so the error surfaces clearly to the
-- frontend and cannot be bypassed via direct API calls.

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
declare
  v_household_id uuid;
  v_dup          record;
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to link programs.';
  end if;

  if not public.can_prepare_application(target_application_id) then
    raise exception 'Your account cannot update programs for this application.';
  end if;

  -- Resolve household for this application
  select household_id into v_household_id
  from public.applications
  where id = target_application_id;

  -- Run duplicate check
  select is_duplicate, duplicate_reason, conflicting_application_no
  into v_dup
  from public.check_application_duplicate(
    v_household_id,
    target_program_id,
    extract(year from now())::integer
  );

  if v_dup.is_duplicate then
    raise exception 'Duplicate application: % (existing ref: %)',
      v_dup.duplicate_reason,
      v_dup.conflicting_application_no
    using errcode = 'P0002';
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

select pg_notify('pgrst', 'reload schema');
