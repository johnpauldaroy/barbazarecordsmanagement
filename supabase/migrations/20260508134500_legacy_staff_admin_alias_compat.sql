-- Compatibility patch: treat legacy municipal staff role keys as admin
-- so existing accounts continue to work after moving to two-role model.

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
        'super admin',
        'mswdo_staff',
        'mswdo staff',
        'mswd_staff',
        'mswd staff',
        'mswd processor',
        'staff',
        'mswdo_approver',
        'mswdo approver',
        'mswd supervisor',
        'approver'
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
        when lower(btrim(auth.jwt() -> 'app_metadata' ->> 'role')) in ('admin','administrator','super_admin','super admin','mswdo_staff','mswdo staff','mswd_staff','mswd staff','mswd processor','staff','mswdo_approver','mswdo approver','mswd supervisor','approver') then 'admin'
        when lower(btrim(auth.jwt() -> 'app_metadata' ->> 'role')) in ('barangay','barangay_staff','barangay staff','barangay_secretary','barangay secretary','barangay user') then 'barangay_secretary'
        else lower(btrim(auth.jwt() -> 'app_metadata' ->> 'role'))
      end,
      case
        when lower(btrim(auth.jwt() -> 'user_metadata' ->> 'role')) in ('admin','administrator','super_admin','super admin','mswdo_staff','mswdo staff','mswd_staff','mswd staff','mswd processor','staff','mswdo_approver','mswdo approver','mswd supervisor','approver') then 'admin'
        when lower(btrim(auth.jwt() -> 'user_metadata' ->> 'role')) in ('barangay','barangay_staff','barangay staff','barangay_secretary','barangay secretary','barangay user') then 'barangay_secretary'
        else lower(btrim(auth.jwt() -> 'user_metadata' ->> 'role'))
      end,
      case
        when lower(btrim(auth.jwt() ->> 'role')) in ('admin','administrator','super_admin','super admin','mswdo_staff','mswdo staff','mswd_staff','mswd staff','mswd processor','staff','mswdo_approver','mswdo approver','mswd supervisor','approver') then 'admin'
        when lower(btrim(auth.jwt() ->> 'role')) in ('barangay','barangay_staff','barangay staff','barangay_secretary','barangay secretary','barangay user') then 'barangay_secretary'
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
            when lower(btrim(r.key)) in ('admin','administrator','super_admin','super admin','mswdo_staff','mswdo staff','mswd_staff','mswd staff','mswd processor','staff','mswdo_approver','mswdo approver','mswd supervisor','approver') then 'admin'
            when lower(btrim(r.key)) in ('barangay','barangay_staff','barangay staff','barangay_secretary','barangay secretary','barangay user') then 'barangay_secretary'
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

select pg_notify('pgrst', 'reload schema');
