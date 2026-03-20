export const portalSections = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    eyebrow: 'Operations',
    summary: 'Daily queue status, priority items, and workload balance for MSWD processing.',
  },
  {
    id: 'applications',
    label: 'Applications',
    path: '/applications',
    eyebrow: 'Queue',
    summary: 'Assigned applications, requirement checks, and the current case review workbench.',
  },
  {
    id: 'households',
    label: 'Households',
    path: '/households',
    eyebrow: 'Registry',
    summary: 'Household lookup, profile review, and recent assistance history.',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    eyebrow: 'Reports',
    summary: 'Operational summaries for backlog review, barangay workload, and export-ready outputs.',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    eyebrow: 'Controls',
    summary: 'Core role, workflow, and audit rules applied inside the portal.',
  },
];

export const dashboardStats = [
  {
    label: 'Pending review',
    value: '48',
    trend: '11 new submissions since 8:00 AM',
    tone: 'warning',
  },
  {
    label: 'Ready for approval',
    value: '14',
    trend: '3 cases are nearing SLA threshold',
    tone: 'accent',
  },
  {
    label: 'Average turnaround',
    value: '2.4 days',
    trend: 'Within the 3-day review target',
    tone: 'good',
  },
];

export const processingLanes = [
  {
    title: 'Intake',
    count: '12',
    note: 'New submissions waiting for processor assignment.',
  },
  {
    title: 'Verification',
    count: '21',
    note: 'Identity and document checks in progress.',
  },
  {
    title: 'Final review',
    count: '8',
    note: 'Cases complete and waiting for supervisor action.',
  },
];

export const priorityCases = [
  {
    reference: 'AICS-2026-00128',
    applicant: 'Maria C. Dela Cruz',
    program: 'AICS',
    status: 'Need supervisor review',
    tone: 'warning',
    updatedAt: 'Mar 20, 2026 10:45 AM',
  },
  {
    reference: 'AICS-2026-00133',
    applicant: 'Danilo P. Serrano',
    program: 'AICS',
    status: 'Duplicate flagged',
    tone: 'neutral',
    updatedAt: 'Mar 20, 2026 10:28 AM',
  },
  {
    reference: 'AICS-2026-00115',
    applicant: 'Rosa B. Ignacio',
    program: 'AICS',
    status: 'Ready for release',
    tone: 'good',
    updatedAt: 'Mar 20, 2026 08:55 AM',
  },
];

export const applicationStats = [
  {
    label: 'Assigned today',
    value: '18',
    trend: 'Across AICS and TUPAD',
    tone: 'accent',
  },
  {
    label: 'For verification',
    value: '21',
    trend: 'Includes duplicate and document checks',
    tone: 'default',
  },
  {
    label: 'For approval',
    value: '14',
    trend: '3 cases older than SLA',
    tone: 'warning',
  },
];

export const filterChips = ['All cases', 'Needs review', 'Needs documents'];

export const applicationQueue = [
  {
    reference: 'AICS-2026-00133',
    applicant: 'Danilo P. Serrano',
    barangay: 'Mayha',
    program: 'AICS',
    status: 'Duplicate flagged',
    tone: 'neutral',
    age: '3h',
  },
  {
    reference: 'AICS-2026-00128',
    applicant: 'Maria C. Dela Cruz',
    barangay: 'Poblacion',
    program: 'AICS',
    status: 'Supervisor review',
    tone: 'warning',
    age: '5h',
  },
  {
    reference: 'TUPAD-2026-00044',
    applicant: 'Joel A. Salangsang',
    barangay: 'Mayha',
    program: 'TUPAD',
    status: 'Need applicant revision',
    tone: 'default',
    age: '1d',
  },
  {
    reference: 'AICS-2026-00115',
    applicant: 'Rosa B. Ignacio',
    barangay: 'Badiangan',
    program: 'AICS',
    status: 'Ready for release',
    tone: 'good',
    age: '1d',
  },
  {
    reference: 'TUPAD-2026-00047',
    applicant: 'Josephine L. Tajan',
    barangay: 'Alojipan',
    program: 'TUPAD',
    status: 'Under verification',
    tone: 'warning',
    age: '2d',
  },
];

export const defaultApplicationReference = 'AICS-2026-00128';

export const applicationCaseDetails = {
  'AICS-2026-00128': {
    reference: 'AICS-2026-00128',
    applicant: 'Maria C. Dela Cruz',
    household: 'HH-PBL-0442',
    program: 'AICS',
    submittedAt: 'Mar 20, 2026 8:06 AM',
    supportType: 'Medical assistance',
    checks: [
      {
        title: 'Identity verified',
        description: 'PhilSys ID and barangay certificate match the resident profile.',
        state: 'complete',
      },
      {
        title: 'Duplicate scan',
        description: 'One historic AICS release found within 90 days. Supervisor review required.',
        state: 'alert',
      },
      {
        title: 'Requirements',
        description: 'Hospital bill and medical abstract uploaded. Social case study still pending.',
        state: 'pending',
      },
    ],
    documents: [
      { name: 'PhilSys ID', status: 'Verified', tone: 'good' },
      { name: 'Barangay certification', status: 'Verified', tone: 'good' },
      { name: 'Hospital bill', status: 'Verified', tone: 'good' },
      { name: 'Social case study report', status: 'Missing', tone: 'warning' },
    ],
  },
  'AICS-2026-00133': {
    reference: 'AICS-2026-00133',
    applicant: 'Danilo P. Serrano',
    household: 'HH-MAY-0118',
    program: 'AICS',
    submittedAt: 'Mar 20, 2026 7:42 AM',
    supportType: 'Food and cash relief',
    checks: [
      {
        title: 'Identity verified',
        description: 'Applicant identity and household registry record already match.',
        state: 'complete',
      },
      {
        title: 'Duplicate scan',
        description: 'Recent release found. Supervisor acknowledgment is still required.',
        state: 'alert',
      },
      {
        title: 'Requirements',
        description: 'Required intake documents are complete and ready for review.',
        state: 'complete',
      },
    ],
    documents: [
      { name: 'PhilSys ID', status: 'Verified', tone: 'good' },
      { name: 'Barangay certification', status: 'Verified', tone: 'good' },
      { name: 'Case intake form', status: 'Verified', tone: 'good' },
      { name: 'Duplicate review note', status: 'Pending', tone: 'warning' },
    ],
  },
  'TUPAD-2026-00044': {
    reference: 'TUPAD-2026-00044',
    applicant: 'Joel A. Salangsang',
    household: 'HH-TOR-0036',
    program: 'TUPAD',
    submittedAt: 'Mar 19, 2026 3:18 PM',
    supportType: 'Emergency employment assistance',
    checks: [
      {
        title: 'Identity verified',
        description: 'Resident profile is valid and barangay endorsement is on file.',
        state: 'complete',
      },
      {
        title: 'Eligibility review',
        description: 'Employment eligibility can proceed once the signed undertaking is re-uploaded.',
        state: 'pending',
      },
      {
        title: 'Requirements',
        description: 'One applicant-signed form is still unreadable.',
        state: 'pending',
      },
    ],
    documents: [
      { name: 'Resident ID', status: 'Verified', tone: 'good' },
      { name: 'Barangay endorsement', status: 'Verified', tone: 'good' },
      { name: 'Signed undertaking', status: 'Needs re-upload', tone: 'warning' },
      { name: 'Program intake form', status: 'Verified', tone: 'good' },
    ],
  },
  'AICS-2026-00115': {
    reference: 'AICS-2026-00115',
    applicant: 'Rosa B. Ignacio',
    household: 'HH-BAD-0201',
    program: 'AICS',
    submittedAt: 'Mar 19, 2026 9:25 AM',
    supportType: 'Medical assistance',
    checks: [
      {
        title: 'Identity verified',
        description: 'Resident identity and household record are fully validated.',
        state: 'complete',
      },
      {
        title: 'Duplicate scan',
        description: 'No conflicting releases found for the review period.',
        state: 'complete',
      },
      {
        title: 'Requirements',
        description: 'All required medical documents are complete.',
        state: 'complete',
      },
    ],
    documents: [
      { name: 'PhilSys ID', status: 'Verified', tone: 'good' },
      { name: 'Medical abstract', status: 'Verified', tone: 'good' },
      { name: 'Hospital bill', status: 'Verified', tone: 'good' },
      { name: 'Case study report', status: 'Verified', tone: 'good' },
    ],
  },
  'TUPAD-2026-00047': {
    reference: 'TUPAD-2026-00047',
    applicant: 'Josephine L. Tajan',
    household: 'HH-ALO-0077',
    program: 'TUPAD',
    submittedAt: 'Mar 18, 2026 1:11 PM',
    supportType: 'Temporary employment assistance',
    checks: [
      {
        title: 'Identity verified',
        description: 'Resident information is matched to the household record.',
        state: 'complete',
      },
      {
        title: 'Eligibility review',
        description: 'Current verification is waiting on barangay employment certification.',
        state: 'progress',
      },
      {
        title: 'Requirements',
        description: 'Barangay certification is still pending confirmation.',
        state: 'pending',
      },
    ],
    documents: [
      { name: 'Resident ID', status: 'Verified', tone: 'good' },
      { name: 'Barangay certification', status: 'Pending', tone: 'warning' },
      { name: 'Program intake form', status: 'Verified', tone: 'good' },
      { name: 'Employment screening note', status: 'Under review', tone: 'neutral' },
    ],
  },
};

export const reviewActions = [
  'Request missing requirements',
  'Forward to supervisor review',
  'Approve for assistance release',
];

export const householdRows = [
  {
    code: 'HH-PBL-0442',
    head: 'Maria C. Dela Cruz',
    barangay: 'Poblacion',
    members: '6',
    openCases: '2',
  },
  {
    code: 'HH-MAY-0118',
    head: 'Danilo P. Serrano',
    barangay: 'Mayha',
    members: '4',
    openCases: '1',
  },
  {
    code: 'HH-BAD-0201',
    head: 'Rosa B. Ignacio',
    barangay: 'Badiangan',
    members: '5',
    openCases: '1',
  },
  {
    code: 'HH-ALO-0077',
    head: 'Josephine L. Tajan',
    barangay: 'Alojipan',
    members: '7',
    openCases: '1',
  },
];

export const defaultHouseholdCode = 'HH-PBL-0442';

export const householdDetailsByCode = {
  'HH-PBL-0442': {
    profile: [
      { label: 'Address', value: 'Purok 3, Poblacion, Barbaza, Antique' },
      { label: 'Income source', value: 'Seasonal labor and small vending' },
      { label: 'Last assistance', value: 'AICS release on Jan 14, 2026' },
      { label: 'Open cases', value: '2 active applications' },
    ],
    history: [
      {
        date: 'Jan 14, 2026',
        program: 'AICS',
        details: 'Medical assistance released after emergency admission.',
      },
      {
        date: 'Sep 03, 2025',
        program: 'Food support',
        details: 'LGU emergency food pack after typhoon response.',
      },
      {
        date: 'Jun 19, 2025',
        program: 'Case study',
        details: 'Initial vulnerability assessment encoded by barangay staff.',
      },
    ],
  },
  'HH-MAY-0118': {
    profile: [
      { label: 'Address', value: 'Sitio Proper, Mayha, Barbaza, Antique' },
      { label: 'Income source', value: 'Construction work and tricycle driving' },
      { label: 'Last assistance', value: 'Food support on Nov 28, 2025' },
      { label: 'Open cases', value: '1 active application' },
    ],
    history: [
      {
        date: 'Nov 28, 2025',
        program: 'Food support',
        details: 'Emergency household food assistance after income disruption.',
      },
      {
        date: 'Apr 12, 2025',
        program: 'AICS',
        details: 'One-time transport assistance for medical follow-up.',
      },
    ],
  },
  'HH-BAD-0201': {
    profile: [
      { label: 'Address', value: 'Purok 5, Badiangan, Barbaza, Antique' },
      { label: 'Income source', value: 'Fishing and sari-sari store sales' },
      { label: 'Last assistance', value: 'Medical support on Feb 02, 2026' },
      { label: 'Open cases', value: '1 active application' },
    ],
    history: [
      {
        date: 'Feb 02, 2026',
        program: 'AICS',
        details: 'Medical reimbursement released for outpatient treatment.',
      },
      {
        date: 'Aug 21, 2025',
        program: 'Case study',
        details: 'Social worker assessment updated the household risk profile.',
      },
    ],
  },
  'HH-ALO-0077': {
    profile: [
      { label: 'Address', value: 'Sitio Baybay, Alojipan, Barbaza, Antique' },
      { label: 'Income source', value: 'Laundry service and seasonal farm labor' },
      { label: 'Last assistance', value: 'No releases in the past 12 months' },
      { label: 'Open cases', value: '1 active application' },
    ],
    history: [
      {
        date: 'Jul 05, 2025',
        program: 'Food support',
        details: 'Temporary food assistance released during flood recovery.',
      },
      {
        date: 'Mar 17, 2025',
        program: 'Registry update',
        details: 'Household composition updated after residency verification.',
      },
    ],
  },
};

export const reportStats = [
  {
    label: 'Aged beyond SLA',
    value: '3',
    trend: 'All pending supervisor decision',
    tone: 'warning',
  },
  {
    label: 'Approvals this month',
    value: '124',
    trend: 'Up 18% from February',
    tone: 'good',
  },
  {
    label: 'Released assistance',
    value: 'PHP 842K',
    trend: 'Across AICS and TUPAD support',
    tone: 'accent',
  },
];

export const workloadByBarangay = [
  { barangay: 'Poblacion', pending: 12, approved: 31 },
  { barangay: 'Mayha', pending: 9, approved: 24 },
  { barangay: 'Badiangan', pending: 7, approved: 19 },
  { barangay: 'Alojipan', pending: 6, approved: 16 },
  { barangay: 'Torocadan', pending: 5, approved: 14 },
];

export const exportCards = [
  {
    title: 'Daily queue summary',
    metric: '48 active cases',
    note: 'Snapshot of intake, approvals, and returned applications.',
  },
  {
    title: 'Barangay workload report',
    metric: '5 barangays in review',
    note: 'Pending and approved cases by barangay.',
  },
  {
    title: 'Release ledger',
    metric: '32 releases this week',
    note: 'Approved assistance ready for validation or release tracking.',
  },
];

export const complianceItems = [
  'Every status change records the user, timestamp, and remarks.',
  'Returned applications stay locked until missing requirements are revalidated.',
  'Duplicate household matches require supervisor acknowledgment before release.',
];

export const settingsGroups = [
  {
    title: 'Access roles',
    items: [
      'MSWD Processor: triage, verify, request revision, encode notes',
      'MSWD Supervisor: approve, reject, override duplicate alerts',
      'Records Admin: manage users, barangays, program controls, and audit exports',
    ],
  },
  {
    title: 'Workflow rules',
    items: [
      'New submissions auto-assign by program and current staff capacity',
      'Cases older than 48 hours trigger SLA alerts',
      'Duplicate flags lock release actions until reviewed',
    ],
  },
];

export const auditHighlights = [
  {
    title: 'Approval safeguards',
    summary: 'Final approval requires remarks and supervisor confirmation.',
  },
  {
    title: 'Document retention',
    summary: 'Sensitive uploads stay in protected storage with role-based access only.',
  },
];

export const monthlyApprovals = [
  { month: 'Oct', count: 78 },
  { month: 'Nov', count: 91 },
  { month: 'Dec', count: 65 },
  { month: 'Jan', count: 104 },
  { month: 'Feb', count: 105 },
  { month: 'Mar', count: 124 },
];

export const programBreakdown = {
  labels: ['AICS', 'TUPAD', 'Food Support', 'Other'],
  values: [61, 22, 11, 6],
};
