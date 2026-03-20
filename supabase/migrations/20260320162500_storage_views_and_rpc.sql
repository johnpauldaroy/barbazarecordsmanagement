insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists application_documents_bucket_select on storage.objects;
create policy application_documents_bucket_select
  on storage.objects
  for select
  using (
    bucket_id = 'application-documents'
    and (
      owner = auth.uid()
      or public.can_access_application(public.safe_uuid((storage.foldername(name))[1]))
    )
  );

drop policy if exists application_documents_bucket_insert on storage.objects;
create policy application_documents_bucket_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'application-documents'
    and owner = auth.uid()
    and public.can_manage_application_documents(public.safe_uuid((storage.foldername(name))[1]))
  );

drop policy if exists application_documents_bucket_update on storage.objects;
create policy application_documents_bucket_update
  on storage.objects
  for update
  using (
    bucket_id = 'application-documents'
    and (
      (owner = auth.uid() and public.can_manage_application_documents(public.safe_uuid((storage.foldername(name))[1])))
      or public.can_review_application(public.safe_uuid((storage.foldername(name))[1]))
    )
  )
  with check (
    bucket_id = 'application-documents'
    and (
      (owner = auth.uid() and public.can_manage_application_documents(public.safe_uuid((storage.foldername(name))[1])))
      or public.can_review_application(public.safe_uuid((storage.foldername(name))[1]))
    )
  );

drop policy if exists application_documents_bucket_delete on storage.objects;
create policy application_documents_bucket_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'application-documents'
    and (
      (owner = auth.uid() and public.can_manage_application_documents(public.safe_uuid((storage.foldername(name))[1])))
      or public.can_review_application(public.safe_uuid((storage.foldername(name))[1]))
    )
  );

create or replace view public.application_queue_view
with (security_invoker = true)
as
select
  a.id,
  a.application_no,
  a.current_status,
  a.submitted_at,
  a.reviewed_at,
  a.decided_at,
  a.updated_at,
  b.id as barangay_id,
  b.name as barangay_name,
  trim(concat_ws(' ', r.first_name, r.middle_name, r.last_name, r.suffix_name)) as applicant_name,
  string_agg(distinct sp.name, ', ' order by sp.name) as program_names,
  max(sh.changed_at) as last_status_at
from public.applications a
join public.residents r on r.id = a.resident_id
join public.barangays b on b.id = a.barangay_id
left join public.application_programs ap on ap.application_id = a.id
left join public.social_programs sp on sp.id = ap.program_id
left join public.status_history sh on sh.application_id = a.id
group by a.id, b.id, r.id;

create or replace view public.beneficiaries_by_program_view
with (security_invoker = true)
as
select
  ar.program_id,
  sp.code as program_code,
  sp.name as program_name,
  count(distinct ar.household_id) as household_count,
  count(distinct ar.resident_id) filter (where ar.resident_id is not null) as resident_count,
  coalesce(sum(ar.amount), 0) as total_amount
from public.assistance_records ar
join public.social_programs sp on sp.id = ar.program_id
where ar.status = 'released'
  and ar.archived_at is null
group by ar.program_id, sp.code, sp.name;

create or replace view public.beneficiaries_by_barangay_view
with (security_invoker = true)
as
select
  ar.barangay_id,
  b.code as barangay_code,
  b.name as barangay_name,
  count(distinct ar.household_id) as household_count,
  count(distinct ar.resident_id) filter (where ar.resident_id is not null) as resident_count,
  coalesce(sum(ar.amount), 0) as total_amount
from public.assistance_records ar
join public.barangays b on b.id = ar.barangay_id
where ar.status = 'released'
  and ar.archived_at is null
group by ar.barangay_id, b.code, b.name;

create or replace view public.unserved_households_view
with (security_invoker = true)
as
select
  h.id,
  h.household_code,
  h.household_name,
  h.barangay_id,
  b.name as barangay_name,
  h.created_at
from public.households h
join public.barangays b on b.id = h.barangay_id
where h.archived_at is null
  and not exists (
    select 1
    from public.assistance_records ar
    where ar.household_id = h.id
      and ar.status = 'released'
      and ar.archived_at is null
  );

create or replace function public.dashboard_metrics(
  filter_start_date timestamptz default null,
  filter_end_date timestamptz default null,
  filter_barangay_id uuid default null,
  filter_program_id uuid default null
)
returns table (
  total_households bigint,
  total_residents bigint,
  total_applicants bigint,
  pending_applications bigint,
  approved_applications bigint,
  rejected_applications bigint,
  unserved_households bigint,
  repeated_assistance_cases bigint
)
language sql
stable
set search_path = public
as $$
  with filtered_households as (
    select h.id
    from public.households h
    where h.archived_at is null
      and (filter_barangay_id is null or h.barangay_id = filter_barangay_id)
  ),
  filtered_residents as (
    select r.id
    from public.residents r
    where r.archived_at is null
      and (filter_barangay_id is null or r.barangay_id = filter_barangay_id)
  ),
  filtered_applications as (
    select distinct a.id, a.resident_id, a.household_id, a.current_status
    from public.applications a
    left join public.application_programs ap on ap.application_id = a.id
    where a.archived_at is null
      and (filter_barangay_id is null or a.barangay_id = filter_barangay_id)
      and (filter_program_id is null or ap.program_id = filter_program_id)
      and (filter_start_date is null or coalesce(a.submitted_at, a.created_at) >= filter_start_date)
      and (filter_end_date is null or coalesce(a.submitted_at, a.created_at) <= filter_end_date)
  ),
  filtered_assistance as (
    select ar.*
    from public.assistance_records ar
    where ar.archived_at is null
      and (filter_barangay_id is null or ar.barangay_id = filter_barangay_id)
      and (filter_program_id is null or ar.program_id = filter_program_id)
      and (filter_start_date is null or coalesce(ar.released_at, ar.created_at) >= filter_start_date)
      and (filter_end_date is null or coalesce(ar.released_at, ar.created_at) <= filter_end_date)
  )
  select
    (select count(*) from filtered_households),
    (select count(*) from filtered_residents),
    (select count(distinct resident_id) from filtered_applications),
    (select count(*) from filtered_applications where current_status in ('submitted', 'under_review', 'needs_more_info', 'verified')),
    (select count(*) from filtered_applications where current_status in ('approved', 'released')),
    (select count(*) from filtered_applications where current_status = 'rejected'),
    (
      select count(*)
      from filtered_households fh
      where not exists (
        select 1
        from filtered_assistance fa
        where fa.household_id = fh.id
          and fa.status = 'released'
      )
    ),
    (
      select count(*)
      from (
        select household_id
        from filtered_assistance
        where status = 'released'
        group by household_id
        having count(*) > 1
      ) repeated_households
    )
$$;

create or replace function public.beneficiary_breakdown_by_program(
  filter_start_date timestamptz default null,
  filter_end_date timestamptz default null,
  filter_barangay_id uuid default null
)
returns table (
  program_id uuid,
  program_code text,
  program_name text,
  beneficiary_households bigint,
  beneficiary_residents bigint,
  total_amount numeric
)
language sql
stable
set search_path = public
as $$
  select
    ar.program_id,
    sp.code,
    sp.name,
    count(distinct ar.household_id) as beneficiary_households,
    count(distinct ar.resident_id) filter (where ar.resident_id is not null) as beneficiary_residents,
    coalesce(sum(ar.amount), 0) as total_amount
  from public.assistance_records ar
  join public.social_programs sp on sp.id = ar.program_id
  where ar.archived_at is null
    and ar.status = 'released'
    and (filter_barangay_id is null or ar.barangay_id = filter_barangay_id)
    and (filter_start_date is null or coalesce(ar.released_at, ar.created_at) >= filter_start_date)
    and (filter_end_date is null or coalesce(ar.released_at, ar.created_at) <= filter_end_date)
  group by ar.program_id, sp.code, sp.name
  order by sp.name
$$;
