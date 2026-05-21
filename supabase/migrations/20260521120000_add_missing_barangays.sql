-- Add missing official barangays of Barbaza, Antique.
-- Uses ON CONFLICT DO NOTHING to safely skip any that already exist.

insert into public.barangays (code, name, district)
values
  ('BINANGBANG_CENTRO', 'Binangbang Centro', 'Central'),
  ('BINANU_AN', 'Binanu-an', 'Central'),
  ('CALAPADAN', 'Calapadan', 'Central'),
  ('CUBAY', 'Cubay', 'Central'),
  ('EMBRANGGA_AN', 'Embrangga-an', 'Central'),
  ('INTEGASAN', 'Integasan', 'Central'),
  ('LOMBUYAN', 'Lombuyan', 'Central'),
  ('MARIGNE', 'Marigne', 'Central'),
  ('MAYOS', 'Mayos', 'Central'),
  ('NALUSDAN', 'Nalusdan', 'Central'),
  ('PALMA', 'Palma', 'Central'),
  ('SOLIGAO', 'Soligao', 'Central'),
  ('TIG_ALARAN', 'Tig-alaran', 'Central'),
  ('YAPO', 'Yapo', 'Central')
on conflict (code) do nothing;

select pg_notify('pgrst', 'reload schema');
