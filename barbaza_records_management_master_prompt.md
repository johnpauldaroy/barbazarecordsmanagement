# Master Prompt — Barbaza Records Management System with Data Analytics

## Role and Objective
You are a senior product strategist, systems analyst, UX architect, and full-stack engineer. Design and scaffold a **production-ready web application** for the **Barbaza Records Management System with Data Analytics** using **React + Vite** for the frontend and **Supabase** for backend, database, authentication, storage, and security.

The system must centralize household and social program records for the Municipality of Barbaza, support online resident assistance applications, prevent duplicate assistance at the household level, and provide descriptive analytics dashboards for municipal decision-making.

Build the solution as if it will be deployed for actual LGU use, with clear separation of roles, secure access control, complete auditability, and a modern, mobile-friendly UI.

---

## Core Background and Problem Context
The current process has the following pain points:
- Household and beneficiary records are fragmented across barangays and across separate social programs.
- There is no single municipal-level system to monitor all beneficiaries.
- Different members of the same household may receive assistance separately without proper household-level visibility.
- It is difficult to identify households that have not yet received assistance.
- Residents from remote or mountainous areas have difficulty going physically to the municipal office.
- Existing processes lack centralized monitoring, strong access control, and descriptive analytics.

The new system must solve these problems through centralized records management, online application intake, secure role-based access, document handling, approvals, and analytics.

---

## Required Tech Stack
Use the following stack strictly unless there is a very strong architectural reason not to:

### Frontend
- React 18+
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- React Hook Form + Zod
- TanStack Query
- Recharts or ApexCharts for dashboards
- date-fns
- Lucide icons

### Backend / Platform
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions where server-side logic is necessary
- Row Level Security (RLS) on all application tables
- Optional: Supabase Realtime for live queue/dashboard updates

### Dev / Quality
- ESLint
- Prettier
- Vitest
- Playwright

---

## Primary Users and Roles
Design the system around these user groups:

1. **Super Admin / System Administrator**
   - Manages global settings, users, roles, barangays, master data, program rules, and audit access.

2. **MSWDO Staff / Municipal Staff**
   - Reviews applicants.
   - Verifies resident and household records.
   - Evaluates eligibility for AICS, TUPAD, and 4Ps.
   - Approves, rejects, returns, or marks applications as pending.
   - Views all barangay data.
   - Uses dashboards and reports.

3. **Barangay Secretary / Barangay Staff**
   - Creates and updates household profiles for their barangay.
   - Assists residents with encoding or validating records.
   - Views applicants and households only within their barangay unless elevated permissions are granted.
   - Monitors local social program participation and analytics for their barangay.

4. **Resident / Applicant**
   - Creates an account or receives assisted access.
   - Applies for assistance online.
   - Uploads requirements.
   - Tracks application status.
   - Receives notifications and instructions.

5. **Approver / Department Head (optional if separate from MSWDO)**
   - Final approval layer for sensitive or high-value cases.

---

## Recommended Market-Aligned Process Design
Implement the workflow using these best-practice patterns:

### 1. Single Intake, Multiple Programs
Create **one resident/household intake flow** and then allow the system to route the case to one or more programs (AICS, TUPAD, 4Ps) based on program eligibility data.

### 2. Household-First Data Model
Do **not** treat applications as fully independent records. Use a **household master record** with linked household members so the municipality can detect duplicate or overlapping assistance within the same family.

### 3. Assisted + Self-Service Intake
Support both:
- **Resident self-service application** through the web portal.
- **Staff-assisted encoding** for applicants with limited internet access.

### 4. Verification Before Approval
Use a clear review flow:
- Submitted
- Under Review
- Needs More Information
- Verified
- Approved
- Rejected / Not Qualified
- Released / Completed

### 5. Program-Specific Eligibility Rules with Shared Screening
Keep a shared screening layer for identity, barangay, household, and duplicate checks, then apply program-specific rules for AICS, TUPAD, and 4Ps.

### 6. Document Checklist Per Program
Each program must have configurable requirements and document checklists.

### 7. Audit Trail Everywhere
Every important action must be logged: who changed what, when, from which role, and what status changed.

### 8. Analytics for Fair Distribution
Dashboards must focus on:
- beneficiaries by barangay
- beneficiaries by program
- households with no assistance yet
- duplicate/flagged households
- pending vs approved vs rejected applications
- trend summaries by month/quarter/year

---

## Main Modules
Build the app with the following modules.

### A. Public Website
- Homepage for the Municipality / MSWDO service information
- Overview of assistance programs
- Eligibility overview
- Requirements checklist
- FAQs
- Contact details
- Call-to-action for residents to apply or track status

### B. Authentication and Access Control
- Email/password login
- Password reset
- Optional OTP/email verification
- Role-based onboarding
- Profile management
- Session persistence
- Supabase RLS-based authorization

### C. Resident Portal
- Resident registration and login
- Applicant profile
- Household profile linkage
- New application wizard
- Program selection or guided assessment
- Upload requirements
- Application status tracking
- Timeline/history of application
- Notifications/instructions from staff
- Downloadable acknowledgement slip or reference number

### D. Household Records Management
- Household master profile
- Household members
- Head of household
- Address and barangay mapping
- Socio-economic indicators
- Income source / employment
- Vulnerability indicators
- Land information
- Assistance history across all programs
- Household-level duplicate checks

### E. Social Program Management
Create separate but connected management areas for:
- **AICS**
- **TUPAD**
- **4Ps**

Each program should support:
- program-specific requirements
- eligibility criteria
- application records
- approval flow
- remarks / notes
- status updates
- beneficiary tagging
- historical tracking

### F. Case Review and Approval Workspace
- Review queue
- Filter by status, barangay, program, date, urgency
- Applicant summary panel
- Household assistance history panel
- Duplicate flag alerts
- Documents review panel
- Internal notes
- Approve / reject / return for revision
- Final decision recording

### G. Records and Search
- Global search by household name, resident name, barangay, reference number
- Advanced filters
- Saved views
- Exportable lists

### H. Analytics Dashboard (Descriptive Analytics)
Include charts, KPI cards, trend graphs, and downloadable reports for:
- total households encoded
- total applicants
- total beneficiaries by program
- beneficiaries by barangay
- applicants by status
- households with no assistance
- households with multiple assistance records
- monthly application volume
- approval rates
- program distribution summaries

### I. Reports
Generate exportable reports (CSV/PDF if later implemented) for:
- household master list
- beneficiary list per program
- non-beneficiary households
- applications by status
- barangay-level summaries
- assistance history per household

### J. Notifications
- Email notification for application submitted
- Email notification for approved / rejected / needs revision
- Staff notification for new applications
- In-app notification center

### K. Audit Logs
- User activity logs
- Record changes
- Status transitions
- Login history
- Sensitive action logs

### L. Admin / Configuration
- Manage users
- Manage roles
- Manage barangays
- Manage program definitions
- Manage document requirements per program
- Manage status labels
- Manage analytics filter defaults

---

## Key Business Rules
Implement the following rules:

1. A resident should belong to a household record.
2. A household may have many household members.
3. An application must be linked to both a resident and a household.
4. Duplicate detection should check at minimum:
   - same resident name + birthday
   - same household address
   - same government ID if available
   - prior assistance record in same program or another program
5. Barangay users should only access records for their barangay by default.
6. Municipal staff can access all barangays.
7. Program requirements must be configurable, not hardcoded.
8. Every status change must store timestamp, user, remarks.
9. Deleted records should preferably use soft delete or archive logic.
10. All uploaded documents must be secured by RLS and storage policies.
11. Analytics should exclude archived/invalid records unless explicitly included.

---

## Suggested Application Workflow
Design the exact flow like this:

### Resident Side
1. Resident registers or logs in.
2. Resident completes personal and household details.
3. Resident starts a new application.
4. Resident selects a program or takes guided screening.
5. Resident uploads requirements.
6. System validates required fields.
7. Application is submitted and receives reference number.
8. Resident tracks status and receives updates.

### Staff Side
1. Staff sees new submissions in review queue.
2. Staff checks resident identity and barangay validity.
3. Staff reviews household history and duplicate flags.
4. Staff checks program-specific eligibility.
5. Staff requests revision if incomplete.
6. Staff approves or rejects the application.
7. System updates program records and analytics.
8. Resident is notified of result and next steps.

---

## Required Database Design
Design a normalized schema in Supabase/Postgres. Include SQL migration-ready tables for at least the following:

- profiles
- roles
- user_roles
- barangays
- households
- household_members
- residents
- land_records
- social_programs
- program_requirements
- applications
- application_programs
- application_documents
- assistance_records
- eligibility_assessments
- status_history
- internal_notes
- notifications
- audit_logs
- settings

### Suggested Important Fields
For each major table, include sensible fields such as:
- uuid primary keys
- created_at / updated_at
- created_by / updated_by
- barangay_id where relevant
- archived_at for soft delete where needed

### Example Relationships
- barangays 1:N households
- households 1:N household_members
- residents 1:N applications
- households 1:N applications
- social_programs 1:N program_requirements
- applications 1:N application_documents
- applications 1:N status_history
- households 1:N assistance_records

---

## Supabase Security Requirements
Implement strong security using Supabase best practices:

1. Enable **Row Level Security** on all exposed tables.
2. Use role-aware policies for resident, barangay staff, municipal staff, and admin.
3. Restrict storage buckets by ownership and role.
4. Use server-side logic or edge functions for sensitive approval operations when needed.
5. Keep service-role usage off the client.
6. Create audit logging for sensitive actions.
7. Use secure environment variable handling.
8. Add rate limiting / anti-abuse strategy for public submission endpoints.

---

## UI/UX Requirements
The UI must be modern, professional, government-ready, and easy for non-technical staff.

### Design Principles
- Clean and accessible layout
- Mobile responsive for residents
- Dashboard-first experience for staff
- Clear hierarchy and readable typography
- Minimal but polished LGU-style visual identity
- Fast forms with autosave where reasonable
- Human-friendly status badges and timelines
- Strong empty states and validation messages

### Required Screens
Create page structures and component hierarchy for at least:
- Public landing page
- Login / registration
- Resident dashboard
- New application wizard
- Application details page
- Household profile page
- Staff dashboard
- Review queue page
- Applicant review page
- Beneficiary records page
- Analytics dashboard
- Reports page
- User management page
- Settings page

---

## Analytics Requirements
Use **descriptive analytics only** for the first version.

Build dashboard widgets for:
- total households
- total residents
- total applicants
- approved / pending / rejected counts
- beneficiaries by program
- beneficiaries by barangay
- unserved households
- repeated assistance cases
- recent applications trend
- top barangays by volume

Add filtering by:
- date range
- barangay
- social program
- application status

---

## Deliverables You Must Generate
Produce the output in a way that a development team can implement immediately.

### 1. Product Blueprint
- project overview
- user roles
- business goals
- functional requirements
- non-functional requirements
- assumptions and constraints

### 2. Recommended System Architecture
- React + Vite frontend architecture
- Supabase architecture
- auth flow
- storage strategy
- analytics approach

### 3. Feature Breakdown by Module
- detailed module list
- user stories
- acceptance criteria

### 4. Database Schema
- ERD description
- SQL tables
- relationships
- indexes
- RLS strategy summary

### 5. UI/UX Plan
- sitemap
- route plan
- page descriptions
- component structure

### 6. Development Roadmap
Break the work into implementation phases:

#### Phase 1 — Foundation
- project setup
- auth
- roles
- barangays
- household records

#### Phase 2 — Application Management
- resident portal
- submission flow
- document upload
- review queue
- approval workflow

#### Phase 3 — Program Management
- AICS
- TUPAD
- 4Ps modules
- requirements and eligibility settings

#### Phase 4 — Analytics and Reports
- dashboards
- KPI cards
- charts
- report exports

#### Phase 5 — Hardening
- audit logs
- testing
- performance
- security review
- deployment

### 7. Folder Structure
Generate a recommended production folder structure for frontend and Supabase.

### 8. Starter Code Guidance
Generate starter code examples for:
- Supabase client setup
- auth guard pattern
- role-based route protection
- form validation pattern
- dashboard query pattern
- storage upload pattern

---

## Recommended Engineering Standards
- Use TypeScript everywhere possible.
- Use reusable form components.
- Keep business rules in service/domain layers, not scattered in components.
- Use optimistic UI only where safe.
- Prefer server-enforced security over client-only restrictions.
- Write clean migrations.
- Add seed data for barangays and sample programs.

---

## Performance and Reliability Requirements
- Fast dashboard loading
- Paginated data tables
- Search optimization with indexes
- Graceful handling of slow connections
- Resumable document uploads if feasible
- Meaningful error handling and retry states

---

## What to Avoid
- Do not build a purely program-centric system without household linkage.
- Do not rely only on frontend role checks.
- Do not hardcode program requirements into UI forms.
- Do not ignore auditability.
- Do not store sensitive files publicly.
- Do not create analytics that cannot be filtered by barangay and date.

---

## Final Instruction
Generate a **complete implementation-ready master plan** for this system using the stack above. Make the output practical, structured, and suitable for direct use in Cursor, ChatGPT, or any AI coding assistant to scaffold the platform.

Prioritize:
1. centralized household-based records
2. fair and traceable assistance distribution
3. secure role-based access
4. remote resident application capability
5. descriptive analytics for decision-making
6. scalable architecture for future expansion
