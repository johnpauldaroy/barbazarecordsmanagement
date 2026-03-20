# Barbaza Records Management System Implementation Blueprint

## Overview
This repository now includes a working frontend shell for the Barbaza Records Management System, but the uploaded master prompt targets a broader production stack:

- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Data and backend: Supabase Postgres, Auth, Storage, Edge Functions, RLS
- Quality: ESLint, Prettier, Vitest, Playwright

The current codebase is still based on Create React App, so this document captures the production direction and the migration path from the current repository state.

## Product Goals
- Centralize household, resident, and assistance records across barangays.
- Prevent duplicate or overlapping assistance using household-first visibility.
- Support both resident self-service and staff-assisted online applications.
- Give MSWDO and barangay staff a secure review workspace with traceable decisions.
- Provide descriptive analytics for fair distribution and service gap visibility.

## Roles
- Super Admin: manages users, roles, barangays, programs, settings, and audit access.
- MSWDO Staff: reviews all submissions, verifies eligibility, approves or rejects cases, monitors analytics.
- Barangay Staff: maintains barangay-scoped records and assisted applications.
- Resident: manages profile, household linkage, applications, and status tracking.
- Optional Approver: handles sensitive or high-value final decisions.

## Functional Modules
- Public portal: program information, eligibility overview, requirements, FAQs, contact, apply CTA.
- Authentication: login, registration, password reset, role-aware onboarding, profile management.
- Resident portal: profile, household linkage, application wizard, document upload, status timeline, notifications.
- Household records: household master, members, address, socio-economic data, vulnerability indicators, assistance history.
- Program management: AICS, TUPAD, and 4Ps requirements, screening rules, and history.
- Case review workspace: queue, applicant summary, duplicate alerts, document review, internal notes, decisions.
- Records and search: global search, advanced filters, saved views, export-ready lists.
- Analytics: KPI cards, barangay and program summaries, unserved households, duplicate flags, approval trends.
- Reports: household list, beneficiary list, non-beneficiary households, application status reports, barangay summaries.
- Audit and notifications: user activity logs, status transitions, login history, in-app and email notifications.
- Admin configuration: users, roles, barangays, program definitions, requirements, settings.

## Target Frontend Architecture
Recommended folder shape after migration:

```text
src/
  app/
    router/
    providers/
    layouts/
  features/
    auth/
    public/
    resident/
    households/
    applications/
    programs/
    review-queue/
    analytics/
    reports/
    admin/
    audit/
  components/
    ui/
    forms/
    data-display/
  hooks/
  lib/
    supabase/
    utils/
  services/
  types/
  styles/
```

Recommended route map:

```text
/
/programs
/eligibility
/requirements
/faqs
/contact
/auth/login
/auth/register
/resident/dashboard
/resident/applications/new
/resident/applications/:applicationId
/resident/profile
/staff/dashboard
/staff/queue
/staff/review/:applicationId
/staff/households
/staff/reports
/analytics
/admin/users
/admin/programs
/admin/barangays
/admin/settings
/admin/audit-logs
```

## Supabase Architecture
- Auth: use Supabase Auth with profile bootstrap on sign-up.
- Role model: resolve user roles through `user_roles`, with barangay linkage where relevant.
- Database: household-first schema in Postgres, indexed for search and analytics filters.
- Storage: private document buckets with role-aware policies and ownership checks.
- Server logic: use Edge Functions for sensitive approval transitions and notification dispatch.
- Analytics: implement descriptive dashboards through SQL views or RPCs filtered by date, barangay, program, and status.

## Core Schema Scope
Tables required by the prompt:

- `profiles`
- `roles`
- `user_roles`
- `barangays`
- `households`
- `household_members`
- `residents`
- `land_records`
- `social_programs`
- `program_requirements`
- `applications`
- `application_programs`
- `application_documents`
- `assistance_records`
- `eligibility_assessments`
- `status_history`
- `internal_notes`
- `notifications`
- `audit_logs`
- `settings`

Suggested relationship rules:

- `barangays` 1:N `households`
- `households` 1:N `household_members`
- `residents` 1:N `applications`
- `households` 1:N `applications`
- `social_programs` 1:N `program_requirements`
- `applications` 1:N `application_documents`
- `applications` 1:N `status_history`
- `households` 1:N `assistance_records`

## Security Baseline
- Enable RLS on every application table and storage bucket.
- Residents can only access their own profiles, households, applications, and uploads.
- Barangay staff can access only records within their assigned barangay unless elevated.
- Municipal staff can review across barangays.
- Admin users can manage master data and audit logs.
- Approval and release actions should be server-enforced, not trusted to the client.
- Every sensitive mutation should write to `audit_logs`.

## Business Rules to Enforce
- A resident belongs to a household.
- An application must link to a resident and a household.
- Duplicate checks must consider resident identity, household address, government ID, and prior assistance history.
- Program requirements are configurable, not hardcoded in forms.
- Status transitions must store timestamp, actor, role context, and remarks.
- Soft deletion or archival should be preferred for records that should not appear in standard analytics.

## Development Roadmap
### Phase 1
- Migrate to Vite and TypeScript.
- Add Tailwind CSS and shadcn/ui.
- Implement auth, role resolution, barangays, and household records.

### Phase 2
- Build resident profile flows, application wizard, document upload, and review queue.
- Implement status transitions, notifications, and duplicate alerts.

### Phase 3
- Add program-specific configuration for AICS, TUPAD, and 4Ps.
- Capture assistance release and beneficiary history.

### Phase 4
- Deliver descriptive analytics dashboards and export-ready reporting views.

### Phase 5
- Harden audit logging, testing, performance, and deployment security.

## Immediate Next Steps
1. Replace CRA with Vite and convert source files to TypeScript.
2. Install the missing stack dependencies required by the prompt.
3. Create Supabase migrations for roles, barangays, households, residents, programs, and applications.
4. Implement auth, route guards, and barangay-scoped access before CRUD features.
5. Wire document uploads, review decisions, and analytics queries in staged releases.
