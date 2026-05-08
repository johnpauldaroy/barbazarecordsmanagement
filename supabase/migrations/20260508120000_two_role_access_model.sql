-- Enforce a two-role access model:
-- 1) barangay_secretary: manages households and application intake
-- 2) admin: views and approves applications, views dashboard, views households (read-only, no edit/delete), manages portal users and settings

insert into public.roles (key, name, description)
values (
  'admin',
  'Admin',
  'Can check and approve assistance applications.'
)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

create or replace function public.has_role(role_key text, target_barangay uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select case
      when lower(btrim(coalesce(role_key, ''))) in (
        'admin',
        'administrator',
        'super_admin',
        'super admin'
      ) then 'admin'
      when lower(btrim(coalesce(role_key, ''))) in (
        'barangay',
        'barangay_staff',
        'barangay staff',
        'barangay_secretary',
        'barangay secretary',
        'barangay user'
      ) then 'barangay_secretary'
      else lower(btrim(coalesce(role_key, '')))
    end as role_key
  ),
  requested_allowed as (
    select role_key
    from requested
    where role_key in ('admin', 'barangay_secretary')
  ),
  jwt_roles as (
    select array_remove(array[
      case
        when lower(btrim(auth.jwt() -> 'app_metadata' ->> 'role')) in ('admin', 'administrator', 'super_admin', 'super admin') then 'admin'
        when lower(btrim(auth.jwt() -> 'app_metadata' ->> 'role')) in ('barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user') then 'barangay_secretary'
        else lower(btrim(auth.jwt() -> 'app_metadata' ->> 'role'))
      end,
      case
        when lower(btrim(auth.jwt() -> 'user_metadata' ->> 'role')) in ('admin', 'administrator', 'super_admin', 'super admin') then 'admin'
        when lower(btrim(auth.jwt() -> 'user_metadata' ->> 'role')) in ('barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user') then 'barangay_secretary'
        else lower(btrim(auth.jwt() -> 'user_metadata' ->> 'role'))
      end,
      case
        when lower(btrim(auth.jwt() ->> 'role')) in ('admin', 'administrator', 'super_admin', 'super admin') then 'admin'
        when lower(btrim(auth.jwt() ->> 'role')) in ('barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user') then 'barangay_secretary'
        else lower(btrim(auth.jwt() ->> 'role'))
      end
    ], null) as role_keys
  )
  select
    exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.profiles p on p.id = ur.user_id
      join requested_allowed req on true
      where ur.user_id = auth.uid()
        and ur.is_active
        and ur.effective_from <= now()
        and (ur.effective_to is null or ur.effective_to >= now())
        and (
          case
            when lower(btrim(r.key)) in ('admin', 'administrator', 'super_admin', 'super admin') then 'admin'
            when lower(btrim(r.key)) in ('barangay', 'barangay_staff', 'barangay staff', 'barangay_secretary', 'barangay secretary', 'barangay user') then 'barangay_secretary'
            else lower(btrim(r.key))
          end
        ) = req.role_key
        and (
          req.role_key = 'admin'
          or target_barangay is null
          or ur.barangay_id = target_barangay
          or (
            ur.barangay_id is null
            and p.default_barangay_id = target_barangay
          )
        )
    )
    or exists (
      select 1
      from requested_allowed req
      cross join jwt_roles jwt
      left join public.profiles p on p.id = auth.uid()
      where req.role_key = any (jwt.role_keys)
        and (
          req.role_key = 'admin'
          or target_barangay is null
          or p.default_barangay_id = target_barangay
        )
    );
$$;

create or replace function public.can_access_barangay(target_barangay uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role('admin', target_barangay)
    or public.has_role('barangay_secretary', target_barangay)
$$;

create or replace function public.can_access_household(target_household_id uuid)
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
      and (
        public.has_role('admin')
        or public.has_role('barangay_secretary', h.barangay_id)
      )
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

create or replace function public.can_manage_resident(target_resident_id uuid)
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
      and public.has_role('barangay_secretary', r.barangay_id)
  )
$$;

create or replace function public.can_access_application(target_application_id uuid)
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
        public.has_role('admin', a.barangay_id)
        or public.has_role('barangay_secretary', a.barangay_id)
        or public.owns_application(a.id)
      )
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
      and (
        public.has_role('admin', a.barangay_id)
        or public.has_role('barangay_secretary', a.barangay_id)
      )
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
      and public.has_role('barangay_secretary', a.barangay_id)
      and a.current_status in ('draft', 'submitted', 'under_review', 'needs_more_info', 'verified')
  )
$$;

create or replace function public.can_prepare_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_edit_application(target_application_id)
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
    and public.has_role('barangay_secretary', target_barangay_id)
$$;

drop policy if exists households_insert_policy on public.households;
create policy households_insert_policy
  on public.households
  for insert
  with check (public.has_role('barangay_secretary', barangay_id));

drop policy if exists households_update_policy on public.households;
create policy households_update_policy
  on public.households
  for update
  using (public.can_manage_household(id))
  with check (
    public.has_role('barangay_secretary', barangay_id)
    and public.same_household_barangay(id, barangay_id)
  );

drop policy if exists households_delete_policy on public.households;
create policy households_delete_policy
  on public.households
  for delete
  using (public.can_manage_household(id));

drop policy if exists residents_insert_policy on public.residents;
create policy residents_insert_policy
  on public.residents
  for insert
  with check (public.has_role('barangay_secretary', barangay_id));

drop policy if exists residents_update_policy on public.residents;
create policy residents_update_policy
  on public.residents
  for update
  using (public.can_manage_resident(id))
  with check (public.has_role('barangay_secretary', barangay_id));

drop policy if exists assistance_records_modify_policy on public.assistance_records;
create policy assistance_records_modify_policy
  on public.assistance_records
  for all
  using (public.has_role('barangay_secretary', barangay_id))
  with check (public.has_role('barangay_secretary', barangay_id));

drop policy if exists internal_notes_select_policy on public.internal_notes;
create policy internal_notes_select_policy
  on public.internal_notes
  for select
  using (
    public.has_role('admin')
    or public.has_role('barangay_secretary', barangay_id)
  );

drop policy if exists internal_notes_modify_policy on public.internal_notes;
create policy internal_notes_modify_policy
  on public.internal_notes
  for all
  using (
    public.has_role('admin')
    or public.has_role('barangay_secretary', barangay_id)
  )
  with check (
    public.has_role('admin')
    or public.has_role('barangay_secretary', barangay_id)
  );

select pg_notify('pgrst', 'reload schema');
