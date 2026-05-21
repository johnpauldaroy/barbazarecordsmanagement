-- Checks whether a household+program combination would be a duplicate.
-- Rules:
--   AICS: blocked if a non-rejected/cancelled AICS application exists within
--         the configurable window (default 90 days from settings).
--   All programs: blocked if a non-rejected/cancelled application for the same
--                 program already exists in the same calendar year.

create or replace function public.check_application_duplicate(
  p_household_id uuid,
  p_program_id uuid,
  p_year integer default extract(year from now())::integer
)
returns table (
  is_duplicate boolean,
  duplicate_reason text,
  conflicting_application_no text,
  conflicting_status text,
  conflicting_submitted_at timestamptz,
  days_since_last integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_program_code text;
  v_window_days  integer;
  v_conflict     record;
begin
  select code into v_program_code
  from public.social_programs
  where id = p_program_id
    and archived_at is null;

  if v_program_code is null then
    return query select
      false, null::text, null::text, null::text, null::timestamptz, null::integer;
    return;
  end if;

  -- AICS: check configurable rolling-window first
  if v_program_code = 'AICS' then
    select coalesce((s.value->>'days')::integer, 90)
    into v_window_days
    from public.settings s
    where s.setting_key = 'applications.duplicate_window_days'
      and s.scope = 'system'
    limit 1;
    v_window_days := coalesce(v_window_days, 90);

    select
      a.application_no,
      a.current_status,
      coalesce(a.submitted_at, a.created_at) as submitted_at,
      extract(day from now() - coalesce(a.submitted_at, a.created_at))::integer as days_since
    into v_conflict
    from public.applications a
    join public.application_programs ap on ap.application_id = a.id
    where a.household_id = p_household_id
      and ap.program_id = p_program_id
      and a.archived_at is null
      and a.current_status not in ('rejected', 'cancelled')
      and coalesce(a.submitted_at, a.created_at) >= now() - (v_window_days || ' days')::interval
    order by coalesce(a.submitted_at, a.created_at) desc
    limit 1;

    if found then
      return query select
        true,
        ('AICS application already exists within the last ' || v_window_days
         || ' days (submitted ' || v_conflict.days_since || ' days ago).')::text,
        v_conflict.application_no,
        v_conflict.current_status,
        v_conflict.submitted_at,
        v_conflict.days_since;
      return;
    end if;
  end if;

  -- All programs: check same calendar year
  select
    a.application_no,
    a.current_status,
    coalesce(a.submitted_at, a.created_at) as submitted_at,
    extract(day from now() - coalesce(a.submitted_at, a.created_at))::integer as days_since
  into v_conflict
  from public.applications a
  join public.application_programs ap on ap.application_id = a.id
  where a.household_id = p_household_id
    and ap.program_id = p_program_id
    and a.archived_at is null
    and a.current_status not in ('rejected', 'cancelled')
    and extract(year from coalesce(a.submitted_at, a.created_at))::integer = p_year
  order by coalesce(a.submitted_at, a.created_at) desc
  limit 1;

  if found then
    return query select
      true,
      ('Household already has an active ' || v_program_code
       || ' application for ' || p_year || '.')::text,
      v_conflict.application_no,
      v_conflict.current_status,
      v_conflict.submitted_at,
      v_conflict.days_since;
    return;
  end if;

  return query select
    false, null::text, null::text, null::text, null::timestamptz, null::integer;
end;
$$;

grant execute on function public.check_application_duplicate(uuid, uuid, integer) to authenticated;

select pg_notify('pgrst', 'reload schema');
