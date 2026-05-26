-- Align Barbaza barangays with the official PSA PSGC list.
-- Source checked: PSA PSGC municipality 0600602000, 39 barangays as of 31 July 2025.

do $$
declare
  official_codes text[] := array[
    'BAGHARI',
    'BAHUYAN',
    'BERI',
    'BIGA-A',
    'BINANGBANG',
    'BINANGBANG_CENTRO',
    'BINANU_AN',
    'CADIAO',
    'CALAPADAN',
    'CAPOYUAN',
    'CUBAY',
    'ESPARAR',
    'GUA',
    'IDAO',
    'IGPALGE',
    'IGTUNARUM',
    'EMBRANGGA_AN',
    'INTEGASAN',
    'IPIL',
    'JINALINAN',
    'LANAS',
    'LANGCAON',
    'LISUB',
    'LUMBOYAN',
    'MABLAD',
    'MAGTULIS',
    'MARIGNE',
    'MAYABAY',
    'MAYOS',
    'NALUSDAN',
    'NARIRONG',
    'PALMA',
    'POBLACION',
    'SAN_ANTONIO',
    'SAN_RAMON',
    'SOLIGAO',
    'TABONGTABONG',
    'TIG_ALARAN',
    'YAPO'
  ];
  fallback_barangay_id uuid;
  invalid_barangay_ids uuid[];
  lumboyan_id uuid;
  lombuyan_id uuid;
begin
  insert into public.barangays (code, name, district, municipality, province, region, is_active, archived_at)
  values
    ('BAGHARI', 'Baghari', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('BAHUYAN', 'Bahuyan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('BERI', 'Beri', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('BIGA-A', 'Biga-a', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('BINANGBANG', 'Binangbang', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('BINANGBANG_CENTRO', 'Binangbang Centro', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('BINANU_AN', 'Binanu-an', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('CADIAO', 'Cadiao', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('CALAPADAN', 'Calapadan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('CAPOYUAN', 'Capoyuan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('CUBAY', 'Cubay', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('ESPARAR', 'Esparar', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('GUA', 'Gua', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('IDAO', 'Idao', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('IGPALGE', 'Igpalge', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('IGTUNARUM', 'Igtunarum', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('EMBRANGGA_AN', 'Embrangga-an', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('INTEGASAN', 'Integasan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('IPIL', 'Ipil', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('JINALINAN', 'Jinalinan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('LANAS', 'Lanas', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('LANGCAON', 'Langcaon', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('LISUB', 'Lisub', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('LUMBOYAN', 'Lumboyan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('MABLAD', 'Mablad', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('MAGTULIS', 'Magtulis', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('MARIGNE', 'Marigne', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('MAYABAY', 'Mayabay', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('MAYOS', 'Mayos', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('NALUSDAN', 'Nalusdan', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('NARIRONG', 'Narirong', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('PALMA', 'Palma', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('POBLACION', 'Poblacion', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('SAN_ANTONIO', 'San Antonio', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('SAN_RAMON', 'San Ramon', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('SOLIGAO', 'Soligao', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('TABONGTABONG', 'Tabongtabong', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('TIG_ALARAN', 'Tig-Alaran', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null),
    ('YAPO', 'Yapo', 'Central', 'Barbaza', 'Antique', 'Region VI', true, null)
  on conflict (code) do update
  set
    name = excluded.name,
    district = excluded.district,
    municipality = excluded.municipality,
    province = excluded.province,
    region = excluded.region,
    is_active = true,
    archived_at = null,
    updated_at = now();

  select id into fallback_barangay_id
  from public.barangays
  where code = 'POBLACION';

  if fallback_barangay_id is null then
    raise exception 'Cannot align barangays because Poblacion was not found.';
  end if;

  select id into lumboyan_id from public.barangays where code = 'LUMBOYAN';
  select id into lombuyan_id from public.barangays where code = 'LOMBUYAN';

  if lombuyan_id is not null and lumboyan_id is not null and lombuyan_id <> lumboyan_id then
    update public.profiles set default_barangay_id = lumboyan_id where default_barangay_id = lombuyan_id;
    update public.households set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    update public.residents set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    update public.land_records set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    update public.applications set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    update public.assistance_records set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    update public.internal_notes set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    update public.audit_logs set barangay_id = lumboyan_id where barangay_id = lombuyan_id;
    delete from public.settings where scope = 'barangay' and scope_ref_id = lombuyan_id;

    delete from public.user_roles ur
    where ur.barangay_id = lombuyan_id
      and exists (
        select 1
        from public.user_roles existing
        where existing.user_id = ur.user_id
          and existing.role_id = ur.role_id
          and existing.barangay_id = lumboyan_id
      );
    update public.user_roles set barangay_id = lumboyan_id where barangay_id = lombuyan_id;

    delete from public.barangay_program_quotas q
    where q.barangay_id = lombuyan_id
      and exists (
        select 1
        from public.barangay_program_quotas existing
        where existing.program_id = q.program_id
          and existing.period_year = q.period_year
          and existing.barangay_id = lumboyan_id
      );
    update public.barangay_program_quotas set barangay_id = lumboyan_id where barangay_id = lombuyan_id;

    delete from public.barangays where id = lombuyan_id;
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
    into invalid_barangay_ids
  from public.barangays
  where municipality = 'Barbaza'
    and code <> all(official_codes);

  if coalesce(array_length(invalid_barangay_ids, 1), 0) > 0 then
    update public.profiles set default_barangay_id = fallback_barangay_id where default_barangay_id = any(invalid_barangay_ids);
    update public.households set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);
    update public.residents set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);
    update public.land_records set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);
    update public.applications set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);
    update public.assistance_records set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);
    update public.internal_notes set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);
    update public.audit_logs set barangay_id = fallback_barangay_id where barangay_id = any(invalid_barangay_ids);

    delete from public.settings where scope = 'barangay' and scope_ref_id = any(invalid_barangay_ids);
    delete from public.user_roles where barangay_id = any(invalid_barangay_ids);
    delete from public.barangay_program_quotas where barangay_id = any(invalid_barangay_ids);
    delete from public.barangays where id = any(invalid_barangay_ids);
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
