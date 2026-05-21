-- Adds qualifying_children_count to get_recommendation_candidates RPC.
-- This field is used by the frontend to determine 4Ps eligibility
-- (requires low income + 2 or more children aged 5–18).
-- DROP required because CREATE OR REPLACE cannot change the return type.

drop function if exists public.get_recommendation_candidates(text, integer, uuid);

create or replace function public.get_recommendation_candidates(
  p_program_code text,
  p_year integer default extract(year from now())::integer,
  p_barangay_id uuid default null
)
returns table (
  rank_position bigint,
  household_id uuid,
  household_code text,
  head_name text,
  barangay_id uuid,
  barangay_name text,
  purok_sitio text,
  address_line1 text,
  full_address text,
  family_count integer,
  monthly_income numeric,
  income_tier text,
  head_occupation text,
  work_status text,
  recommendation_score integer,
  recommendation_reasons text[],
  qualifying_children_count integer,
  quota_id uuid,
  quota_max integer,
  quota_used bigint,
  quota_remaining bigint,
  quota_is_active boolean,
  quota_exists boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with selected_program as (
    select sp.id, sp.code, sp.name
    from public.social_programs sp
    where sp.code = p_program_code
      and sp.status = 'active'
      and sp.archived_at is null
    limit 1
  ),
  candidate_households as (
    select
      h.id as household_id,
      h.household_code,
      coalesce(
        nullif(
          btrim(concat_ws(' ', h.head_first_name, h.head_middle_name, h.head_last_name, h.head_suffix)),
          ''
        ),
        nullif(h.household_name, ''),
        'Registered household'
      ) as head_name,
      h.barangay_id,
      b.name as barangay_name,
      h.purok_sitio,
      h.address_line1,
      array_to_string(array_remove(array[
        nullif(h.purok_sitio, ''),
        nullif(h.address_line1, ''),
        b.name,
        'Barbaza',
        'Antique'
      ], null), ', ') as full_address,
      greatest(
        coalesce(h.household_size, 1),
        1 + case
          when jsonb_typeof(h.family_members) = 'array' then jsonb_array_length(h.family_members)
          else 0
        end
      )::integer as family_count,
      coalesce(h.head_monthly_income, h.monthly_income, 0)::numeric as monthly_income,
      nullif(btrim(coalesce(h.head_occupation, '')), '') as head_occupation,
      sp.id as program_id,
      -- Count residents aged 5–18 for 4Ps eligibility check
      (
        select count(*)::integer
        from public.residents r
        join public.household_members hm on hm.resident_id = r.id
        where hm.household_id = h.id
          and hm.archived_at is null
          and r.archived_at is null
          and r.status = 'active'
          and r.birth_date is not null
          and date_part('year', age(r.birth_date)) between 5 and 18
      ) as qualifying_children_count
    from public.households h
    join public.barangays b on b.id = h.barangay_id
    cross join selected_program sp
    where h.archived_at is null
      and h.status = 'active'
      and (p_barangay_id is null or h.barangay_id = p_barangay_id)
      and public.can_access_barangay(h.barangay_id)
      and not exists (
        select 1
        from public.applications a
        join public.application_programs ap on ap.application_id = a.id
        where a.household_id = h.id
          and ap.program_id = sp.id
          and a.archived_at is null
          and a.current_status not in ('rejected', 'cancelled')
          and extract(year from coalesce(a.decided_at, a.submitted_at, a.created_at))::integer = p_year
      )
  ),
  scored as (
    select
      c.*,
      case
        when c.monthly_income = 0 then 'No Income / No Work'
        when c.monthly_income < 10000 then 'Low Income'
        when c.monthly_income < 20000 then 'Moderate Income'
        else 'Above Moderate'
      end as income_tier,
      case
        when c.head_occupation is null and c.monthly_income = 0 then 'No work recorded'
        when c.head_occupation is null then 'No occupation recorded'
        when c.monthly_income = 0 then 'No income recorded'
        else c.head_occupation
      end as work_status,
      (
        (least(c.family_count, 10) * 5)
        + case
          when c.head_occupation is null and c.monthly_income = 0 then 30
          when c.head_occupation is null or c.monthly_income = 0 then 15
          else 0
        end
        + case
          when c.monthly_income = 0 then 20
          when c.monthly_income < 10000 then 15
          when c.monthly_income < 20000 then 8
          else 0
        end
      )::integer as recommendation_score,
      array_remove(array[
        'Family members: ' || c.family_count::text,
        case
          when c.head_occupation is null and c.monthly_income = 0 then 'No work and no income recorded'
          when c.head_occupation is null then 'No occupation recorded'
          when c.monthly_income = 0 then 'No income recorded'
          else null
        end,
        case
          when c.monthly_income = 0 then 'No income household'
          when c.monthly_income < 10000 then 'Low income household'
          when c.monthly_income < 20000 then 'Moderate income household'
          else null
        end
      ], null)::text[] as recommendation_reasons
    from candidate_households c
  )
  select
    row_number() over (
      order by
        s.recommendation_score desc,
        s.monthly_income asc,
        s.family_count desc,
        s.household_code asc
    ) as rank_position,
    s.household_id,
    s.household_code,
    s.head_name,
    s.barangay_id,
    s.barangay_name,
    s.purok_sitio,
    s.address_line1,
    s.full_address,
    s.family_count,
    s.monthly_income,
    s.income_tier,
    s.head_occupation,
    s.work_status,
    s.recommendation_score,
    s.recommendation_reasons,
    s.qualifying_children_count,
    q.quota_id,
    q.max_beneficiaries as quota_max,
    q.used_count as quota_used,
    q.remaining_count as quota_remaining,
    q.is_active as quota_is_active,
    coalesce(q.quota_exists, false) as quota_exists
  from scored s
  left join lateral public.check_barangay_quota(s.barangay_id, s.program_id, p_year) q on true
  order by
    s.recommendation_score desc,
    s.monthly_income asc,
    s.family_count desc,
    s.household_code asc;
$$;

grant execute on function public.get_recommendation_candidates(text, integer, uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
