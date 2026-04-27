const ROLE_ALIASES = {
  super_admin: 'super_admin',
  'super admin': 'super_admin',
  admin: 'super_admin',
  administrator: 'super_admin',

  mswdo_staff: 'mswdo_staff',
  mswd_staff: 'mswdo_staff',
  staff: 'mswdo_staff',
  'mswdo staff': 'mswdo_staff',
  'mswd staff': 'mswdo_staff',
  'mswd processor': 'mswdo_staff',

  mswdo_approver: 'mswdo_approver',
  'mswdo approver': 'mswdo_approver',
  'mswd supervisor': 'mswdo_approver',
  approver: 'mswdo_approver',

  barangay_secretary: 'barangay_secretary',
  barangay: 'barangay_secretary',
  barangay_staff: 'barangay_secretary',
  'barangay user': 'barangay_secretary',
  'barangay secretary': 'barangay_secretary',
  'barangay staff': 'barangay_secretary',

  resident: 'resident',
  applicant: 'resident',
};

const SECTION_ACCESS_BY_ROLE = {
  super_admin: ['dashboard', 'applications', 'households', 'reports', 'settings'],
  mswdo_staff: ['dashboard', 'applications', 'households', 'reports'],
  mswdo_approver: ['dashboard', 'applications', 'reports'],
  barangay_secretary: ['dashboard', 'applications', 'households', 'reports'],
  resident: ['applications'],
};

function normalizeRoleSource(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resolveSessionRoleKey(session) {
  const explicitRoleKey = normalizeRoleSource(session?.roleKey);
  if (ROLE_ALIASES[explicitRoleKey]) {
    return ROLE_ALIASES[explicitRoleKey];
  }

  const fallbackRole = normalizeRoleSource(session?.role);
  if (ROLE_ALIASES[fallbackRole]) {
    return ROLE_ALIASES[fallbackRole];
  }

  return explicitRoleKey || fallbackRole || '';
}

export function canAccessSection(session, sectionId) {
  const roleKey = resolveSessionRoleKey(session);
  const allowedSections = SECTION_ACCESS_BY_ROLE[roleKey] ?? [];
  return allowedSections.includes(sectionId);
}

export function canAccessPath(session, path, sections = []) {
  const matchedSection = sections.find((section) => section.path === path);
  if (!matchedSection) {
    return false;
  }

  return canAccessSection(session, matchedSection.id);
}

export function getAccessibleSections(session, sections = []) {
  return sections.filter((section) => canAccessSection(session, section.id));
}

export function getDefaultPathForRole(session, sections = []) {
  const allowedSections = getAccessibleSections(session, sections);
  return allowedSections[0]?.path || '/dashboard';
}

export function canManagePortalUsers(session) {
  return resolveSessionRoleKey(session) === 'super_admin';
}

export function canManagePrograms(session) {
  return resolveSessionRoleKey(session) === 'super_admin';
}

export function canManageHouseholds(session) {
  const roleKey = resolveSessionRoleKey(session);
  return ['super_admin', 'mswdo_staff', 'barangay_secretary'].includes(roleKey);
}

export function canCreateApplications(session) {
  const roleKey = resolveSessionRoleKey(session);
  return ['super_admin', 'mswdo_staff', 'barangay_secretary', 'resident'].includes(roleKey);
}

export function canApproveApplications(session) {
  const roleKey = resolveSessionRoleKey(session);
  return roleKey === 'super_admin';
}

export function canViewUploadedDocuments(session) {
  const roleKey = resolveSessionRoleKey(session);
  return ['super_admin', 'mswdo_staff'].includes(roleKey);
}
