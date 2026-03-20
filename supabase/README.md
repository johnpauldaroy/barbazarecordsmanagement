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
- `seed.sql`
  - starter barangays, programs, requirements, and settings for development

## Assumptions

- The storage path convention for uploads is `<application_id>/<user_id>/<filename>`.
- Sensitive approval flows should eventually be routed through an Edge Function or server-side action even though the database now has baseline RLS.
- `seed.sql` contains starter data aligned to the current mock UI, not a complete official barangay master list.

## Suggested next steps

1. Run the migrations in a Supabase project and apply `seed.sql`.
2. Wire `@supabase/supabase-js` into the React app and map auth users to `profiles` and `residents`.
3. Add edge functions for approval transitions, duplicate-check scoring, and notification dispatch.
4. Add integration tests for RLS using resident, barangay staff, municipal staff, and admin test users.
