# Supabase Database Foundation

This folder contains the first-pass Supabase database foundation for the Barbaza Records Management System.

## Included

- `migrations/20260320160000_extensions_and_enums.sql`
  - extensions and enum types
- `migrations/20260320160500_core_schema.sql`
  - normalized tables, foreign keys, constraints, and indexes
- `migrations/20260320161000_functions_and_triggers.sql`
  - profile bootstrap, audit helpers, reference generators, validation triggers, and helper functions for RLS
- `migrations/20260320161500_reference_data.sql`
  - required platform roles
- `migrations/20260320162000_rls_policies.sql`
  - row level security policies for resident, barangay staff, municipal staff, and admin access
- `migrations/20260320162500_storage_views_and_rpc.sql`
  - private storage bucket policies plus analytics views and RPC functions
- `migrations/20260412110000_portal_user_barangay_assignment.sql`
  - portal user directory and user-management RPC updates to support barangay-scoped staff assignment
- `migrations/20260412123000_role_alias_in_has_role.sql`
  - updates `has_role` so `barangay_staff` and `barangay_secretary` are treated as equivalent for RLS checks
- `migrations/20260412132000_barangay_secretary_rls_compat.sql`
  - updates barangay-scoped RLS policies/functions to explicitly allow `barangay_secretary` in addition to `barangay_staff`
- `functions/admin-create-portal-user/index.ts`
  - edge function used by super admins to create Auth users (with password) and assign portal roles
- `seed.sql`
  - starter barangays, programs, requirements, and settings for development

## Assumptions

- The storage path convention for uploads is `<application_id>/<user_id>/<filename>`.
- Sensitive approval flows should eventually be routed through an Edge Function or server-side action even though the database now has baseline RLS.
- `seed.sql` contains starter data aligned to the current mock UI, not a complete official barangay master list.

## Suggested next steps

1. Run the migrations in a Supabase project and apply `seed.sql`.
2. Deploy the edge function: `supabase functions deploy admin-create-portal-user`.
3. Verify the function has access to `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in project secrets.
4. Wire `@supabase/supabase-js` into the React app and map auth users to `profiles` and `residents`.
5. Add edge functions for approval transitions, duplicate-check scoring, and notification dispatch.
6. Add integration tests for RLS using resident, barangay staff, municipal staff, and admin test users.
