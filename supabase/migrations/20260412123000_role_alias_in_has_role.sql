create or replace function public.has_role(role_key text, target_barangay uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select case
      when lower(btrim(coalesce(role_key, ''))) in ('barangay_staff', 'barangay_secretary')
        then array['barangay_staff', 'barangay_secretary']::text[]
      else array[lower(btrim(coalesce(role_key, '')))]::text[]
    end as role_keys
  )
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    cross join normalized n
    where ur.user_id = auth.uid()
      and ur.is_active
      and ur.effective_from <= now()
      and (ur.effective_to is null or ur.effective_to >= now())
      and lower(r.key) = any (n.role_keys)
      and (
        target_barangay is null
        or ur.barangay_id is null
        or ur.barangay_id = target_barangay
      )
  );
$$;
