create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;
create extension if not exists btree_gin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum (
      'draft',
      'submitted',
      'under_review',
      'needs_more_info',
      'verified',
      'approved',
      'rejected',
      'released',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum (
      'pending',
      'uploaded',
      'under_review',
      'accepted',
      'rejected',
      'expired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'program_status') then
    create type public.program_status as enum (
      'draft',
      'active',
      'inactive',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'assessment_result') then
    create type public.assessment_result as enum (
      'pending',
      'eligible',
      'conditionally_eligible',
      'ineligible'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum (
      'in_app',
      'email',
      'sms'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type public.notification_status as enum (
      'pending',
      'sent',
      'delivered',
      'read',
      'failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'setting_scope') then
    create type public.setting_scope as enum (
      'system',
      'barangay',
      'program',
      'user'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'assistance_status') then
    create type public.assistance_status as enum (
      'planned',
      'approved',
      'released',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'note_visibility') then
    create type public.note_visibility as enum (
      'internal',
      'supervisor',
      'admin'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'household_status') then
    create type public.household_status as enum (
      'active',
      'inactive',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'resident_status') then
    create type public.resident_status as enum (
      'active',
      'inactive',
      'deceased',
      'moved_out',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'civil_status_type') then
    create type public.civil_status_type as enum (
      'single',
      'married',
      'widowed',
      'separated',
      'divorced',
      'annulled',
      'unknown'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sex_type') then
    create type public.sex_type as enum (
      'female',
      'male',
      'other',
      'prefer_not_to_say'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'relationship_type') then
    create type public.relationship_type as enum (
      'head',
      'spouse',
      'child',
      'parent',
      'sibling',
      'relative',
      'guardian',
      'boarder',
      'other'
    );
  end if;
end $$;
