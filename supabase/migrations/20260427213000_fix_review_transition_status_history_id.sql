-- Recreate review transition RPC with fully qualified status_history id lookup.

create or replace function public.transition_application_for_review(
  target_application_id uuid,
  target_status text,
  target_remarks text default null,
  target_approved_amount numeric default null
)
returns table (
  id uuid,
  application_no text,
  current_status public.application_status,
  review_stage text,
  reviewed_at timestamptz,
  decided_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_target_status public.application_status;
  v_remarks text;
  v_is_decision boolean;
  v_can_decide boolean;
begin
  if auth.uid() is null then
    raise exception 'You need an authenticated Supabase session to review applications.';
  end if;

  select *
    into v_application
  from public.applications
  where applications.id = target_application_id
    and applications.archived_at is null;

  if not found then
    raise exception 'Application was not found.';
  end if;

  if not public.can_review_application(target_application_id) then
    raise exception 'Your account cannot review this application.';
  end if;

  begin
    v_target_status := coalesce(nullif(btrim(target_status), ''), 'under_review')::public.application_status;
  exception
    when invalid_text_representation then
      raise exception 'Invalid application status: %', target_status;
  end;

  v_remarks := nullif(btrim(coalesce(target_remarks, '')), '');
  v_is_decision := v_target_status in ('approved', 'rejected', 'released', 'cancelled');
  v_can_decide := public.has_role('super_admin', v_application.barangay_id);

  if v_is_decision and not v_can_decide then
    raise exception 'Only admins can make final application decisions.';
  end if;

  if v_application.current_status in ('released', 'cancelled') then
    raise exception 'This application is already closed.';
  end if;

  if v_application.current_status = 'rejected' and v_target_status <> 'under_review' then
    raise exception 'Rejected applications must be reopened for review before another decision.';
  end if;

  if v_application.current_status = 'approved' and v_target_status not in ('released', 'under_review') then
    raise exception 'Approved applications can only be released or reopened for review.';
  end if;

  if v_application.current_status = v_target_status then
    raise exception 'Application is already marked as %.', replace(v_target_status::text, '_', ' ');
  end if;

  update public.applications as a
  set
    current_status = v_target_status,
    review_stage = case
      when v_target_status = 'submitted' then 'intake'
      when v_target_status in ('under_review', 'needs_more_info') then 'staff_review'
      when v_target_status = 'verified' then 'supervisor_review'
      when v_target_status = 'approved' then 'approved'
      when v_target_status = 'rejected' then 'rejected'
      when v_target_status = 'released' then 'released'
      when v_target_status = 'cancelled' then 'cancelled'
      else a.review_stage
    end,
    reviewed_at = case
      when v_target_status in ('under_review', 'needs_more_info', 'verified', 'approved', 'rejected', 'released')
        then coalesce(a.reviewed_at, now())
      else a.reviewed_at
    end,
    decided_at = case
      when v_target_status in ('approved', 'rejected', 'released', 'cancelled') then now()
      when v_target_status = 'under_review' then null
      else a.decided_at
    end,
    updated_by = auth.uid(),
    updated_at = now()
  where a.id = target_application_id;

  update public.application_programs as ap
  set
    decision_status = v_target_status,
    approved_amount = case
      when v_target_status = 'approved' and target_approved_amount is not null
        then target_approved_amount
      else ap.approved_amount
    end,
    decision_notes = coalesce(v_remarks, ap.decision_notes),
    updated_by = auth.uid(),
    updated_at = now()
  where ap.application_id = target_application_id;

  if v_remarks is not null then
    update public.status_history as sh
    set remarks = v_remarks
    where sh.id = (
      select latest_history.id
      from public.status_history as latest_history
      where latest_history.application_id = target_application_id
        and latest_history.to_status = v_target_status
      order by latest_history.changed_at desc
      limit 1
    );
  end if;

  return query
  select
    applications.id,
    applications.application_no,
    applications.current_status,
    applications.review_stage,
    applications.reviewed_at,
    applications.decided_at,
    applications.updated_at
  from public.applications
  where applications.id = target_application_id;
end;
$$;

grant execute on function public.transition_application_for_review(uuid, text, text, numeric) to authenticated;

select pg_notify('pgrst', 'reload schema');
