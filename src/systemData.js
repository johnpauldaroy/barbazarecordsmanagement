export const workspaces = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    tagline: 'System overview',
    summary: 'Landing page for the municipal product vision, priorities, and build constraints.',
  },
  {
    id: 'public',
    label: 'Public Portal',
    path: '/public',
    tagline: 'Programs and intake guidance',
    summary: 'Resident-facing information about assistance programs, eligibility flow, and first-step intake.',
  },
  {
    id: 'resident',
    label: 'Resident Portal',
    path: '/resident',
    tagline: 'Application tracking',
    summary: 'Household-linked self-service page for statuses, uploads, and profile-linked records.',
  },
  {
    id: 'staff',
    label: 'Staff Workspace',
    path: '/staff',
    tagline: 'Review and approval queue',
    summary: 'Operational workspace for validation, duplicate checks, and case management.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    tagline: 'Distribution and reporting',
    summary: 'Barangay-level counts, reporting outputs, and fairness visibility for municipal planning.',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    path: '/blueprint',
    tagline: 'Architecture and roadmap',
    summary: 'Stack migration path, route map, schema scope, and phased delivery plan.',
  },
];

export const roles = [
  {
    name: 'Super Admin',
    focus: 'Governance',
    scope: 'Users, roles, settings, barangays, and audit controls',
  },
  {
    name: 'MSWDO Staff',
    focus: 'Case review',
    scope: 'Cross-barangay intake validation, approvals, and analytics',
  },
  {
    name: 'Barangay Staff',
    focus: 'Encoding',
    scope: 'Barangay-scoped household maintenance and assisted applications',
  },
  {
    name: 'Resident',
    focus: 'Self-service',
    scope: 'Profile, household linkage, documents, status tracking',
  },
];

export const programCards = [
  {
    name: 'AICS',
    type: 'Emergency Assistance',
    summary:
      'For crisis-based support with fast screening, documentary review, and tracked disbursement history.',
    highlights: [
      'Configurable checklist',
      'Household duplicate alerts',
      'Approval remarks and release tracking',
    ],
  },
  {
    name: 'TUPAD',
    type: 'Livelihood Support',
    summary:
      'Supports short-term emergency employment with eligibility validation, scheduling, and beneficiary tagging.',
    highlights: [
      'Labor-oriented requirements',
      'Barangay volume monitoring',
      'Employment cycle history',
    ],
  },
  {
    name: '4Ps Monitoring',
    type: 'Program Visibility',
    summary:
      'Tracks household participation, overlaps, and municipal-level descriptive insights for coordinated decision making.',
    highlights: [
      'Household participation view',
      'Coverage gaps by barangay',
      'Shared profile and assistance history',
    ],
  },
];

export const processFlow = [
  {
    title: 'Resident registration',
    description:
      'The user creates an account or is encoded by staff, then completes identity and household details.',
  },
  {
    title: 'Guided screening',
    description:
      'The system applies shared checks first, then routes the case to one or more social programs.',
  },
  {
    title: 'Requirements upload',
    description: 'Applicants submit program requirements with validation and secure storage policies.',
  },
  {
    title: 'Staff verification',
    description:
      'Reviewers inspect duplicate risk, household history, barangay scope, and program compliance.',
  },
  {
    title: 'Decision and release',
    description:
      'Approvals, rejections, requests for revision, and assistance release all feed the audit trail.',
  },
];

export const dashboardCards = [
  {
    label: 'Linked household',
    value: 'B-04-118',
    trend: 'Head of household verified on March 18, 2026',
  },
  { label: 'Open applications', value: '2', trend: 'One for AICS and one for TUPAD pre-screening' },
  {
    label: 'Unread notices',
    value: '3',
    trend: 'Review remarks and barangay confirmation reminders',
  },
  {
    label: 'Required uploads',
    value: '1',
    trend: 'Income certification still pending for TUPAD',
  },
];

export const householdRecords = [
  {
    label: 'Barangay',
    value: 'Poblacion',
    note: 'Mapped to barangay-scoped staff access policies',
  },
  {
    label: 'Members',
    value: '6 residents',
    note: 'Includes senior citizen and one dependent in school',
  },
  {
    label: 'Income profile',
    value: 'Seasonal labor',
    note: 'Used for vulnerability and eligibility assessment',
  },
  {
    label: 'Assistance history',
    value: '1 prior AICS release',
    note: 'Prevents duplicate approval without reviewer confirmation',
  },
];

export const queueItems = [
  {
    reference: 'AICS-2026-00128',
    applicant: 'Maria C. Dela Cruz',
    barangay: 'Poblacion',
    program: 'AICS',
    status: 'Under Review',
    statusTone: 'warning',
    updatedAt: 'Mar 20, 2026',
  },
  {
    reference: 'TUPAD-2026-00044',
    applicant: 'Joel A. Salangsang',
    barangay: 'Mayha',
    program: 'TUPAD',
    status: 'Needs More Info',
    statusTone: 'neutral',
    updatedAt: 'Mar 19, 2026',
  },
  {
    reference: 'AICS-2026-00115',
    applicant: 'Rosa B. Ignacio',
    barangay: 'Badiangan',
    program: 'AICS',
    status: 'Verified',
    statusTone: 'good',
    updatedAt: 'Mar 19, 2026',
  },
  {
    reference: '4PS-2026-00009',
    applicant: 'Janet P. Domingo',
    barangay: 'Torocadan',
    program: '4Ps',
    status: 'Submitted',
    statusTone: 'default',
    updatedAt: 'Mar 18, 2026',
  },
];

export const moduleCards = [
  {
    title: 'Household master records',
    summary:
      'Addresses, members, vulnerability indicators, land data, and all assistance history in one profile.',
  },
  {
    title: 'Case review workspace',
    summary:
      'Status queue, document panel, duplicate flags, notes, and approval actions with remarks.',
  },
  {
    title: 'Program configuration',
    summary:
      'Manage AICS, TUPAD, and 4Ps requirements, status labels, and screening logic without hardcoding.',
  },
  {
    title: 'Audit and notifications',
    summary: 'Every sensitive action is logged and can trigger staff or resident updates.',
  },
];

export const duplicateAlerts = [
  {
    title: 'Shared address match',
    description:
      'The same household address appears on a previously released AICS case within the last 90 days.',
  },
  {
    title: 'Possible identity overlap',
    description:
      'Applicant name and birth date closely match an existing resident record from another program entry.',
  },
  {
    title: 'Cross-program assistance history',
    description:
      'Two household members already have active assistance records that may affect eligibility.',
  },
];

export const analyticsCards = [
  {
    label: 'Total households',
    value: '4,286',
    trend: '+143 records added this quarter',
    tone: 'accent',
  },
  { label: 'Applicants', value: '1,184', trend: '64 pending verification this week', tone: 'default' },
  {
    label: 'Unserved households',
    value: '1,902',
    trend: 'Priority list for outreach planning',
    tone: 'warning',
  },
  {
    label: 'Duplicate-flagged cases',
    value: '37',
    trend: 'Requires manual review before release',
    tone: 'warning',
  },
];

export const beneficiaryDistribution = [
  { label: 'Poblacion', value: 184 },
  { label: 'Mayha', value: 151 },
  { label: 'Badiangan', value: 129 },
  { label: 'Torocadan', value: 106 },
  { label: 'Alojipan', value: 92 },
];

export const reports = [
  {
    title: 'Household master list',
    metric: '4,286 households',
    note: 'Filter by barangay, encoded date, and household assistance status',
  },
  {
    title: 'Beneficiaries by program',
    metric: 'AICS 612 | TUPAD 298 | 4Ps 447',
    note: 'Supports quarterly service distribution review',
  },
  {
    title: 'Applications by status',
    metric: 'Submitted 84 | Review 64 | Approved 239',
    note: 'Useful for queue balancing and staffing decisions',
  },
  {
    title: 'Non-beneficiary households',
    metric: '1,902 households',
    note: 'Supports fairness analysis and barangay outreach planning',
  },
];

export const architectureLayers = [
  {
    title: 'Frontend shell',
    summary:
      'React + Vite + TypeScript with route-based workspaces, reusable form components, and query-managed data flows.',
  },
  {
    title: 'Access and policy layer',
    summary: 'Supabase Auth, role resolution, guarded routes, and RLS policies per role and barangay scope.',
  },
  {
    title: 'Data domain',
    summary:
      'Postgres tables centered on households, applications, programs, assistance records, and status history.',
  },
  {
    title: 'Storage and automation',
    summary:
      'Secure document buckets, notification workflows, audit logging, and edge-function backed approval actions.',
  },
];

export const routeGroups = [
  {
    title: 'Public',
    routes: ['/', '/programs', '/eligibility', '/requirements', '/faqs', '/contact'],
  },
  {
    title: 'Resident',
    routes: [
      '/resident/dashboard',
      '/resident/applications/new',
      '/resident/applications/:id',
      '/resident/profile',
    ],
  },
  {
    title: 'Staff',
    routes: [
      '/staff/dashboard',
      '/staff/queue',
      '/staff/review/:id',
      '/staff/households',
      '/staff/reports',
    ],
  },
  {
    title: 'Admin',
    routes: ['/admin/users', '/admin/programs', '/admin/barangays', '/admin/settings', '/admin/audit-logs'],
  },
];

export const tableGroups = [
  {
    title: 'Identity and access',
    tables: ['profiles', 'roles', 'user_roles', 'barangays', 'settings'],
  },
  {
    title: 'Household domain',
    tables: ['households', 'household_members', 'residents', 'land_records'],
  },
  {
    title: 'Applications',
    tables: [
      'social_programs',
      'program_requirements',
      'applications',
      'application_programs',
      'application_documents',
    ],
  },
  {
    title: 'Operations and audit',
    tables: [
      'assistance_records',
      'eligibility_assessments',
      'status_history',
      'internal_notes',
      'notifications',
      'audit_logs',
    ],
  },
];

export const phasePlan = [
  {
    title: 'Phase 1',
    summary:
      'Set up Vite, TypeScript, auth foundations, role model, barangay data, and household records management.',
  },
  {
    title: 'Phase 2',
    summary:
      'Deliver resident intake, application wizard, requirements upload, review queue, and approval statuses.',
  },
  {
    title: 'Phase 3',
    summary:
      'Add AICS, TUPAD, and 4Ps configuration, program-specific rules, and beneficiary tracking.',
  },
  {
    title: 'Phase 4',
    summary:
      'Build descriptive analytics, chart filters, report exports, and barangay fairness dashboards.',
  },
  {
    title: 'Phase 5',
    summary:
      'Harden audit trails, automated notifications, test coverage, security review, and deployment setup.',
  },
];

export const implementationSteps = [
  'Migrate the repo from Create React App to Vite and switch source files to TypeScript.',
  'Install Tailwind CSS, shadcn/ui, React Router, TanStack Query, React Hook Form, and Zod.',
  'Create a Supabase project with seed data for barangays, roles, and social programs.',
  'Write SQL migrations for the household-first schema and enable RLS on every exposed table.',
  'Implement auth, role-aware route guards, and barangay-scoped access rules before CRUD features.',
  'Wire document uploads, review queue actions, analytics queries, and audit logging in phased releases.',
];

export const businessRules = [
  'Every application must be linked to both a resident and a household record.',
  'Barangay users are restricted to their barangay unless an elevated role grants wider scope.',
  'Program requirements must remain configurable and not hardcoded inside the UI.',
  'All status transitions need timestamps, user context, and remarks for auditability.',
  'Duplicate checks must evaluate resident identity, address overlap, government ID, and prior assistance history.',
  'Archived records should be excluded from analytics unless explicitly requested.',
];
