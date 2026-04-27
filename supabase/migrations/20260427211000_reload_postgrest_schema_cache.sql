-- Force Supabase/PostgREST to refresh its schema cache after new RPCs.
select pg_notify('pgrst', 'reload schema');
