const ROLE_ALIASES = {
  super_admin: 'admin',
  'super admin': 'admin',
  admin: 'admin',
  administrator: 'admin',
  mswdo_approver: 'admin',
  'mswdo approver': 'admin',
  'mswd supervisor': 'admin',
  mswdo_staff: 'admin',
  mswd_staff: 'admin',
  staff: 'admin',
  'mswdo staff': 'admin',
  'mswd staff': 'admin',
  'mswd processor': 'admin',
  approver: 'admin',

  barangay_secretary: 'barangay_secretary',
  barangay: 'barangay_secretary',
  barangay_staff: 'barangay_secretary',
  'barangay user': 'barangay_secretary',
  'barangay secretary': 'barangay_secretary',
  'barangay staff': 'barangay_secretary',
};

// admin: dashboard, applications, households (view-only), land_map, reports, settings
// barangay_secretary: dashboard, applications, households (full manage), reports, land_map
const SECTION_ACCESS_BY_ROLE = {
  admin: ['dashboard', 'applications', 'households', 'land_map', 'reports', 'settings'],
  barangay_secretary: ['dashboard', 'applications', 'households', 'reports', 'land_map'],
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
  return resolveSessionRoleKey(session) === 'admin';
}

export function canManagePrograms(session) {
  return resolveSessionRoleKey(session) === 'admin';
}

export function canViewHouseholds(session) {
  const roleKey = resolveSessionRoleKey(session);
  return roleKey === 'admin' || roleKey === 'barangay_secretary';
}

export function canManageHouseholds(session) {
  const roleKey = resolveSessionRoleKey(session);
  return roleKey === 'barangay_secretary';
}

export function canCreateApplications(session) {
  const roleKey = resolveSessionRoleKey(session);
  return roleKey === 'barangay_secretary';
}

export function canApproveApplications(session) {
  const roleKey = resolveSessionRoleKey(session);
  return roleKey === 'admin';
}

export function canViewUploadedDocuments(session) {
  const roleKey = resolveSessionRoleKey(session);
  return ['admin', 'barangay_secretary'].includes(roleKey);
}
