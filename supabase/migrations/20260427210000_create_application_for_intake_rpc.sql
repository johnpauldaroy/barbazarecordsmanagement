-- Server-side application creation for intake. Direct client inserts can be
-- blocked by RLS even when the role helper says the user can manage the target
-- barangay, so this function performs the same validation and inserts as the
-- table owner.

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
    coalesce(nullif(btrim(target_current_status), ''), 'submitted'),
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

select pg_notify('pgrst', 'reload schema');
