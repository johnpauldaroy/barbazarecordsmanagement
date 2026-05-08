import { createClient } from '@supabase/supabase-js';
import {
  supabase,
  hasSupabaseConfig,
  supabaseUrl,
  supabasePublishableKey,
} from './supabase';
import {
  canApproveApplications,
  canCreateApplications,
  canManageHouseholds,
  resolveSessionRoleKey,
} from './roleAccess';
import * as demoData from './systemData';

const USE_DEMO = process.env.NODE_ENV === 'test';
const PENDING_APPLICATION_STATUSES = ['submitted', 'under_review', 'needs_more_info', 'verified'];
const APPROVED_APPLICATION_STATUSES = ['approved', 'released'];
const SLA_HOURS = 48;
let sessionContext = null;

function getSessionContext() {
  return sessionContext;
}

function assertHouseholdReadAccess() {
  const roleKey = resolveSessionRoleKey(getSessionContext());
  if (roleKey !== 'admin' && roleKey !== 'barangay_secretary') {
    throw new Error('You do not have access to household records.');
  }
}

function assertHouseholdManagementAccess() {
  if (!canManageHouseholds(getSessionContext())) {
    throw new Error('Only barangay secretaries can add, edit, or delete household records.');
  }
}

function assertApplicationCreationAccess() {
  if (!canCreateApplications(getSessionContext())) {
    throw new Error('Only barangay secretaries can create assistance applications.');
  }
}

function assertApplicationApprovalAccess() {
  if (!canApproveApplications(getSessionContext())) {
    throw new Error('Only admin accounts can approve or reject applications.');
  }
}

function getScopedBarangayScope() {
  const session = getSessionContext();
  const roleKey = resolveSessionRoleKey(session);
  const isScopedRole = roleRequiresBarangayAssignment(roleKey);
  const barangayId = session?.barangayId ?? null;
  const barangayName = session?.barangayName ?? null;
  const barangayCode = session?.barangayCode ?? null;

  return {
    isScopedRole,
    barangayId,
    barangayName,
    barangayCode,
  };
}

function roleRequiresBarangayAssignment(roleKey) {
  const normalizedRole = String(roleKey ?? '').trim().toLowerCase();
  return normalizedRole === 'barangay_secretary' || normalizedRole === 'barangay_staff';
}

function isBarangayRecordMatch(recordBarangayName) {
  const scope = getScopedBarangayScope();
  if (!scope.isScopedRole || !scope.barangayName) {
    return true;
  }

  return normalizeText(recordBarangayName) === normalizeText(scope.barangayName);
}

function filterRowsByScopedBarangay(rows = [], getBarangayName) {
  const scope = getScopedBarangayScope();
  if (!scope.isScopedRole || !scope.barangayName) {
    return rows;
  }

  return rows.filter((row) => isBarangayRecordMatch(getBarangayName(row)));
}

function assertBarangayScopeForWrite(targetBarangay) {
  const scope = getScopedBarangayScope();
  if (!scope.isScopedRole) {
    return;
  }

  const normalizedTarget = normalizeText(targetBarangay);
  const normalizedScope = normalizeText(scope.barangayName);
  if (normalizedScope && normalizedTarget && normalizedTarget !== normalizedScope) {
    throw new Error(`Barangay staff can only manage records for ${scope.barangayName}.`);
  }
}

function assertBarangayScopeForRead() {
  const scope = getScopedBarangayScope();
  if (!scope.isScopedRole) {
    return;
  }

  if (!scope.barangayId) {
    throw new Error('Your account has no assigned barangay. Ask an administrator to set your barangay assignment.');
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function formatStatusLabel(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPersonName(person = {}) {
  return [
    person.first_name,
    person.middle_name,
    person.last_name,
    person.suffix_name,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No date recorded' : date.toLocaleDateString();
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
}

function parseApplicantName(fullName) {
  const tokens = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
      suffixName: '',
    };
  }

  if (tokens.length === 1) {
    return {
      firstName: tokens[0],
      middleName: '',
      lastName: tokens[0],
      suffixName: '',
    };
  }

  return {
    firstName: tokens[0],
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(' ') : '',
    lastName: tokens[tokens.length - 1],
    suffixName: '',
  };
}

function getNextDemoApplicationReference(programCode) {
  const matchingReferences = demoData.applicationQueue
    .map((item) => item.reference)
    .filter((reference) => reference.startsWith(`${programCode}-`));

  const latestReference = matchingReferences
    .map((reference) => {
      const [, year, sequence] = reference.split('-');
      return {
        year,
        sequence: Number(sequence),
      };
    })
    .filter((item) => item.year && Number.isFinite(item.sequence))
    .sort((left, right) => right.sequence - left.sequence)[0];

  const nextYear = latestReference?.year || '2026';
  const nextSequence = (latestReference?.sequence ?? 0) + 1;
  return `${programCode}-${nextYear}-${String(nextSequence).padStart(5, '0')}`;
}

function buildDemoApplicationDetail({
  reference,
  applicant,
  householdCode,
  program,
  note,
  uploadedRequirements,
}) {
  const submittedAt = new Date().toLocaleString();
  const uploadedEntries = Object.entries(uploadedRequirements ?? {}).filter(([, meta]) => meta?.name);
  const uploadedByRequirementId = new Map(uploadedEntries);
  const missingRequirements = (program?.requirements ?? []).filter(
    (requirement) => requirement.is_required && !uploadedByRequirementId.has(requirement.id)
  );

  return {
    reference,
    applicant,
    household: householdCode,
    program: program?.name || program?.code || 'Unassigned',
    submittedAt,
    supportType: program?.supportLabel || program?.category || 'General assistance',
    history: [
      {
        timestamp: submittedAt,
        action: 'Application submitted',
        actor: 'MSWD Portal',
        note: note?.trim() || 'Application intake was recorded from the demo portal.',
      },
    ],
    checks: [
      {
        title: 'Application status',
        description: `Current workflow status: ${formatStatusLabel(
          missingRequirements.length ? 'needs_more_info' : 'submitted'
        )}.`,
        state: missingRequirements.length ? 'pending' : 'progress',
      },
      {
        title: 'Requirements',
        description: missingRequirements.length
          ? `${missingRequirements.length} required document(s) still missing.`
          : 'All required documents are already uploaded.',
        state: missingRequirements.length ? 'pending' : 'complete',
      },
      {
        title: 'Processor note',
        description: note?.trim() || 'No internal note was recorded during intake.',
        state: note?.trim() ? 'complete' : 'progress',
      },
    ],
    documents: (program?.requirements ?? []).map((requirement) => {
      const fileMeta = uploadedByRequirementId.get(requirement.id);

      return {
        name: requirement.label,
        fileName: fileMeta?.name,
        status: fileMeta ? 'Uploaded' : 'Missing',
        tone: fileMeta ? 'good' : 'warning',
        viewUrl: fileMeta ? '/barbaza-seal.png' : null,
      };
    }),
    meta: {
      currentStatus: missingRequirements.length ? 'needs_more_info' : 'submitted',
      uploadedRequirementCount: uploadedEntries.length,
    },
  };
}

function normalizeWorkflowStatus(value) {
  const normalized = normalizeText(value).replace(/\s+/g, '_');
  const statusAliases = {
    duplicate_flagged: 'under_review',
    supervisor_review: 'verified',
    need_supervisor_review: 'verified',
    need_applicant_revision: 'needs_more_info',
    under_verification: 'under_review',
    ready_for_release: 'approved',
  };

  return statusAliases[normalized] || normalized;
}

function buildTransitionCheck(status) {
  const normalizedStatus = normalizeWorkflowStatus(status);
  const state = ['approved', 'released', 'verified'].includes(normalizedStatus)
    ? 'complete'
    : normalizedStatus === 'rejected' || normalizedStatus === 'needs_more_info'
      ? 'pending'
      : 'progress';

  return {
    title: 'Application status',
    description: `Current workflow status: ${formatStatusLabel(normalizedStatus)}.`,
    state,
  };
}

function transitionDemoApplication({ reference, status, remarks, currentRecord }) {
  const statusLabel = formatStatusLabel(status);
  const now = new Date().toLocaleString();
  const baseDetail = currentRecord
    || demoData.applicationCaseDetails[reference]
    || demoData.applicationCaseDetails[demoData.defaultApplicationReference];
  const detail = {
    ...baseDetail,
    reference,
    history: [
      {
        timestamp: now,
        action: `Status changed to ${statusLabel}`,
        actor: 'MSWD Portal',
        note: remarks?.trim() || `Application moved to ${statusLabel}.`,
      },
      ...(baseDetail?.history ?? []),
    ],
    checks: [
      buildTransitionCheck(status),
      ...(baseDetail?.checks ?? []).filter((item) => normalizeText(item.title) !== 'application status'),
    ],
    meta: {
      ...(baseDetail?.meta ?? {}),
      currentStatus: status,
    },
  };

  return {
    detail,
    status: statusLabel,
    tone: statusTone(status),
    age: '0h',
  };
}

function getDemoApplicationDetail(reference) {
  const detail = demoData.applicationCaseDetails[reference]
    || demoData.applicationCaseDetails[demoData.defaultApplicationReference];
  const queueItem = demoData.applicationQueue.find((item) => item.reference === reference);
  const currentStatus = normalizeWorkflowStatus(queueItem?.status || detail?.meta?.currentStatus || 'submitted');

  return {
    ...detail,
    reference: detail?.reference || reference,
    status: formatStatusLabel(currentStatus),
    documents: (detail?.documents ?? []).map((document) => ({
      ...document,
      viewUrl: document.viewUrl || '/barbaza-seal.png',
    })),
    meta: {
      ...(detail?.meta ?? {}),
      currentStatus,
    },
  };
}

async function createDocumentViewUrls(documentRows = []) {
  const entries = await Promise.all(
    documentRows.map(async (document) => {
      if (!document.object_path) {
        return [document, null];
      }

      const bucketName = document.bucket_name || 'application-documents';
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(document.object_path, 60 * 60);

      if (error) {
        console.warn(`Failed to create signed URL for "${document.file_name}".`, error);
        return [document, null];
      }

      return [document, data?.signedUrl || null];
    })
  );

  return new Map(entries.map(([document, viewUrl]) => [document.id, viewUrl]));
}

function statusTone(status) {
  switch (status) {
    case 'ready_for_release':
    case 'approved':
    case 'released':
    case 'verified':
      return 'good';
    case 'duplicate_flagged':
    case 'supervisor_review':
    case 'under_review':
    case 'under_verification':
      return 'warning';
    case 'needs_more_info':
    case 'need_applicant_revision':
      return 'default';
    default:
      return 'neutral';
  }
}

function documentTone(status) {
  const normalized = normalizeText(status);

  if (
    normalized.includes('missing')
    || normalized.includes('pending')
    || normalized.includes('re-upload')
    || normalized.includes('needs')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('uploaded')
    || normalized.includes('verified')
    || normalized.includes('received')
    || normalized.includes('complete')
  ) {
    return 'good';
  }

  return 'neutral';
}

function sanitizeFileName(fileName) {
  return String(fileName ?? 'document')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeRequirementCode(value, fallbackLabel = '') {
  const source = String(value ?? fallbackLabel ?? '').trim();
  return source
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeFileTypeList(value) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? '').split(',');

  return source
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function mapProgramsWithRequirements(programs = [], requirements = []) {
  const requirementsByProgramId = new Map();

  for (const requirement of requirements) {
    const list = requirementsByProgramId.get(requirement.program_id) ?? [];
    list.push(requirement);
    requirementsByProgramId.set(requirement.program_id, list);
  }

  return programs.map((program) => ({
    ...program,
    requirements: requirementsByProgramId.get(program.id) ?? [],
    supportLabel: program.category || program.name || program.code,
  }));
}

function isNotFoundError(error) {
  return error?.code === 'PGRST116';
}

function normalizeUuidValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isSameUuid(left, right) {
  const normalizedLeft = normalizeUuidValue(left);
  const normalizedRight = normalizeUuidValue(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function isRowLevelSecurityError(error, tableName) {
  const errorCode = String(error?.code ?? '').trim();
  if (errorCode !== '42501') {
    return false;
  }

  const message = String(error?.message ?? '').toLowerCase();
  const normalizedTableName = String(tableName ?? '').trim().toLowerCase();
  return message.includes('row-level security policy') && message.includes(normalizedTableName);
}

function isUniqueConstraintError(error, constraintFragment) {
  const errorCode = String(error?.code ?? '').trim();
  if (errorCode !== '23505') {
    return false;
  }

  const details = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return details.includes(String(constraintFragment ?? '').toLowerCase());
}

function getErrorMessage(error, fallbackMessage) {
  return error?.message || fallbackMessage;
}

async function getFunctionInvokeErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  if (error.context) {
    try {
      const body = await error.context.clone().json();
      const contextMessage = body?.error || body?.message || body?.details;
      if (contextMessage) {
        return contextMessage;
      }
    } catch {
      // Fall back to the generic error message when the response body is not JSON.
    }
  }

  return error?.message || fallbackMessage;
}

function shouldTrySignupFallback(invokeError, invokeMessage = '') {
  const normalizedMessage = String(invokeMessage).toLowerCase();
  const normalizedName = String(invokeError?.name ?? '').toLowerCase();

  return (
    normalizedName.includes('functionsfetcherror')
    || normalizedName.includes('functionsrelayerror')
    || normalizedMessage.includes('failed to send a request to the edge function')
    || normalizedMessage.includes('failed to fetch')
    || normalizedMessage.includes('could not find')
    || normalizedMessage.includes('not found')
    || normalizedMessage.includes('edge function returned a non-2xx status code')
  );
}

async function ensureSuperAdminAccess() {
  const { data, error } = await supabase.rpc('has_role', {
    role_key: 'super_admin',
  });

  if (error) {
    throw new Error(error.message || 'Failed to verify super admin access.');
  }

  if (!data) {
    throw new Error('Only super admins can create portal users.');
  }
}

async function createUserViaSignupFallback(payload) {
  await ensureSuperAdminAccess();

  const isolatedSignupClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: signupData, error: signupError } = await isolatedSignupClient.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.displayName,
      },
    },
  });

  if (signupError) {
    throw new Error(signupError.message || 'Supabase sign up failed.');
  }

  const createdUserId = signupData?.user?.id;
  if (!createdUserId) {
    throw new Error('Sign up did not return a user ID. Check Supabase Auth email sign-up settings.');
  }

  const { error: roleUpdateError } = await supabase.rpc('update_portal_user', {
    target_user_id: createdUserId,
    target_display_name: payload.displayName,
    target_role_key: payload.role,
    target_is_active: payload.isActive,
    target_barangay_id: payload.barangayId || null,
  });

  if (roleUpdateError) {
    throw new Error(roleUpdateError.message || 'Failed to assign role for the created account.');
  }

  return {
    id: createdUserId,
    displayName: payload.displayName,
    email: payload.email,
    role: payload.role,
    roleName: formatStatusLabel(payload.role),
    isActive: payload.isActive,
    lastSignIn: null,
    barangayId: payload.barangayId || null,
    barangayCode: payload.barangayCode || null,
    barangayName: payload.barangayName || null,
  };
}

function getReferenceDate(...values) {
  const firstValue = values.find(Boolean);

  if (!firstValue) {
    return null;
  }

  const date = new Date(firstValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getTrailingMonths(count) {
  const months = [];
  const currentMonth = startOfMonth(new Date());

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    months.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - offset, 1));
  }

  return months;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isCurrentMonth(date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function buildMonthlyApprovals(applicationRows) {
  const months = getTrailingMonths(6);
  const countsByMonth = new Map(months.map((month) => [getMonthKey(month), 0]));

  for (const application of applicationRows ?? []) {
    if (!APPROVED_APPLICATION_STATUSES.includes(application.current_status)) {
      continue;
    }

    const referenceDate = getReferenceDate(
      application.decided_at,
      application.reviewed_at,
      application.submitted_at,
      application.created_at
    );

    if (!referenceDate) {
      continue;
    }

    const key = getMonthKey(referenceDate);
    if (countsByMonth.has(key)) {
      countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
    }
  }

  return months.map((month) => ({
    month: formatMonthLabel(month),
    count: countsByMonth.get(getMonthKey(month)) ?? 0,
  }));
}

function buildWorkloadByBarangay(applicationRows) {
  const workload = new Map();

  for (const application of applicationRows ?? []) {
    const barangay = application.barangay?.name || 'Unknown barangay';
    const current = workload.get(barangay) ?? { barangay, pending: 0, approved: 0 };
    const approvalDate = getReferenceDate(
      application.decided_at,
      application.reviewed_at,
      application.submitted_at,
      application.created_at
    );

    if (PENDING_APPLICATION_STATUSES.includes(application.current_status)) {
      current.pending += 1;
    }

    if (APPROVED_APPLICATION_STATUSES.includes(application.current_status) && approvalDate && isCurrentMonth(approvalDate)) {
      current.approved += 1;
    }

    workload.set(barangay, current);
  }

  return [...workload.values()].sort((left, right) => {
    if (right.pending !== left.pending) {
      return right.pending - left.pending;
    }

    return left.barangay.localeCompare(right.barangay);
  });
}

function getSlaReferenceDate(application) {
  return getReferenceDate(application.submitted_at, application.created_at);
}

function getSlaElapsedHours(application, now = new Date()) {
  const startDate = getSlaReferenceDate(application);

  if (!startDate) {
    return null;
  }

  const endDate = PENDING_APPLICATION_STATUSES.includes(application.current_status)
    ? now
    : getReferenceDate(application.decided_at, application.reviewed_at, application.updated_at, now);
  const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return Math.max(0, diffHours);
}

function countPendingSlaBreaches(applicationRows) {
  const now = new Date();

  return (applicationRows ?? []).filter((application) => {
    if (!PENDING_APPLICATION_STATUSES.includes(application.current_status)) {
      return false;
    }

    const elapsedHours = getSlaElapsedHours(application, now);
    return elapsedHours !== null && elapsedHours >= SLA_HOURS;
  }).length;
}

function buildSlaTrend(applicationRows) {
  const months = getTrailingMonths(6);
  const monthKeys = new Set(months.map((month) => getMonthKey(month)));
  const summary = new Map(
    months.map((month) => [
      getMonthKey(month),
      { period: formatMonthLabel(month), breaches: 0, withinSla: 0 },
    ])
  );
  const now = new Date();

  for (const application of applicationRows ?? []) {
    const startDate = getSlaReferenceDate(application);

    if (!startDate) {
      continue;
    }

    const monthKey = getMonthKey(startDate);
    if (!monthKeys.has(monthKey)) {
      continue;
    }

    const elapsedHours = getSlaElapsedHours(application, now);
    if (elapsedHours === null) {
      continue;
    }

    const record = summary.get(monthKey);
    if (!record) {
      continue;
    }

    if (elapsedHours >= SLA_HOURS) {
      record.breaches += 1;
    } else {
      record.withinSla += 1;
    }
  }

  return months.map((month) => summary.get(getMonthKey(month)));
}

function hasPositiveMetric(values = []) {
  return values.some((value) => Number(value ?? 0) > 0);
}

function hasChartDataSignal(chartData = {}) {
  const monthlyHasSignal = hasPositiveMetric((chartData.monthlyApprovals ?? []).map((item) => item.count));
  const programHasSignal =
    (chartData.programBreakdown?.labels?.length ?? 0) > 0
    && hasPositiveMetric(chartData.programBreakdown?.values ?? []);
  const workloadHasSignal =
    (chartData.workloadByBarangay?.length ?? 0) > 0
    && chartData.workloadByBarangay.some(
      (item) => Number(item.pending ?? 0) > 0 || Number(item.approved ?? 0) > 0
    );
  const slaHasSignal =
    (chartData.slaTrend?.length ?? 0) > 0
    && chartData.slaTrend.some(
      (item) => Number(item.breaches ?? 0) > 0 || Number(item.withinSla ?? 0) > 0
    );

  return monthlyHasSignal || programHasSignal || workloadHasSignal || slaHasSignal;
}

function buildDemoHouseholdDetails(code, row) {
  const demoDetails = demoData.householdDetailsByCode?.[code];

  if (demoDetails) {
    return demoDetails;
  }

  return {
    profile: [
      { label: 'Household code', value: row?.code ?? code },
      { label: 'Head of family', value: row?.head ?? 'Unknown household' },
      { label: 'Barangay', value: row?.barangay ?? 'Unknown barangay' },
      { label: 'Members', value: row?.members ?? '1' },
      { label: 'Open cases', value: row?.openCases ?? '0' },
    ],
    history: [],
  };
}

function normalizeCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function deterministicCoordinateOffset(seedText, amplitude = 0.018) {
  const seed = String(seedText ?? '');
  const codePointTotal = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  const normalized = ((codePointTotal % 2000) / 1000) - 1;
  return normalized * amplitude;
}

function getDemoBarangayCoordinate(name) {
  const presets = {
    poblacion: { latitude: 11.1959, longitude: 122.0389 },
    mayha: { latitude: 11.2318, longitude: 122.0836 },
    badiangan: { latitude: 11.2024, longitude: 122.0565 },
    alojipan: { latitude: 11.1713, longitude: 122.0238 },
    torocadan: { latitude: 11.2134, longitude: 122.0684 },
  };

  return presets[normalizeText(name)] ?? { latitude: 11.1959, longitude: 122.0389 };
}

function normalizeProgramDisplayName(programRow = {}) {
  return programRow?.name || programRow?.code || 'Other social program';
}

function buildDemoHouseholdProgramMapRows() {
  const scope = getScopedBarangayScope();
  if (scope.isScopedRole) {
    assertBarangayScopeForRead();
  }

  const programsByHouseholdCode = new Map();

  for (const detail of Object.values(demoData.applicationCaseDetails ?? {})) {
    const householdCode = detail?.household;
    const programName = detail?.program;

    if (!householdCode || !programName) {
      continue;
    }

    const bucket = programsByHouseholdCode.get(householdCode) ?? new Set();
    bucket.add(programName);
    programsByHouseholdCode.set(householdCode, bucket);
  }

  const scopedHouseholdRows = filterRowsByScopedBarangay(
    demoData.householdRows ?? [],
    (household) => household?.barangay
  );

  const rows = scopedHouseholdRows.map((household) => {
    const baseCoordinate = getDemoBarangayCoordinate(household.barangay);
    const latitude = baseCoordinate.latitude + deterministicCoordinateOffset(`${household.code}-lat`);
    const longitude = baseCoordinate.longitude + deterministicCoordinateOffset(`${household.code}-lng`);
    const fullAddress = [
      household.purokSitio,
      household.addressLine1,
      household.barangay,
      'Barbaza',
      'Antique',
    ].filter(Boolean).join(', ');

    return {
      code: household.code,
      head: household.head || household.household_name || 'Registered household',
      barangay: household.barangay || 'Unknown barangay',
      purokSitio: household.purokSitio || '',
      addressLine1: household.addressLine1 || '',
      fullAddress: fullAddress || 'Address pending update',
      latitude,
      longitude,
      programs: [...(programsByHouseholdCode.get(household.code) ?? [])].sort((left, right) =>
        left.localeCompare(right)
      ),
    };
  });

  return {
    rows,
    missingCoordinates: [],
    scope: {
      isScoped: Boolean(scope.isScopedRole),
      barangayName: scope.barangayName || null,
    },
  };
}

async function runServiceQuery(runQuery, fallbackValue, label) {
  if (USE_DEMO) {
    return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
  }

  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
  }

  try {
    return await runQuery();
  } catch (error) {
    console.error(label, error);
    throw new Error(getErrorMessage(error, label));
  }
}

async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('You need an authenticated Supabase session to save live application data.');
  }

  return user;
}

async function getBarangayByName(name) {
  const { data, error } = await supabase
    .from('barangays')
    .select('id, code, name')
    .eq('name', name)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Barangay "${name}" was not found in Supabase.`);
  }

  return data;
}

async function findOrCreateHousehold({ householdCode, barangay, applicantName }) {
  const { data: existingHousehold, error: householdError } = await supabase
    .from('households')
    .select('id, household_code, barangay_id, household_name, household_size')
    .eq('household_code', householdCode)
    .is('archived_at', null)
    .maybeSingle();

  if (householdError && !isNotFoundError(householdError)) {
    throw householdError;
  }

  if (existingHousehold) {
    if (!isSameUuid(existingHousehold.barangay_id, barangay.id)) {
      throw new Error(
        `Household code "${householdCode}" is already assigned to another barangay. Use the matching barangay or a different household code.`
      );
    }

    return existingHousehold;
  }

  const applicantParts = parseApplicantName(applicantName);
  const householdName = applicantParts.lastName
    ? `${applicantParts.lastName} Household`
    : `Household ${householdCode}`;

  const { data, error } = await supabase
    .from('households')
    .insert({
      household_code: householdCode,
      barangay_id: barangay.id,
      household_name: householdName,
      address_line1: 'Pending address confirmation',
      registration_source: 'mswd_portal',
      household_size: 1,
    })
    .select('id, household_code, barangay_id, household_name, household_size')
    .single();

  if (error) {
    if (isUniqueConstraintError(error, 'household_code')) {
      throw new Error(
        `Household code "${householdCode}" already exists under another barangay or outside your access scope.`
      );
    }

    if (isRowLevelSecurityError(error, 'households')) {
      throw new Error(
        `Your account cannot create household records for ${barangay.name}. Ask an administrator to verify your barangay role assignment.`
      );
    }

    throw error;
  }

  return data;
}

async function findOrCreateResident({ applicantName, household, barangayId, barangayName }) {
  const applicantParts = parseApplicantName(applicantName);

  if (!applicantParts.firstName || !applicantParts.lastName) {
    throw new Error('Applicant name must include at least a first name and last name.');
  }

  const { data: residents, error: residentLookupError } = await supabase
    .from('residents')
    .select('id, first_name, middle_name, last_name, suffix_name, household_id, barangay_id')
    .eq('household_id', household.id)
    .is('archived_at', null);

  if (residentLookupError) {
    throw residentLookupError;
  }

  const normalizedApplicantName = normalizeText(applicantName);
  const matchingResident = (residents ?? []).find(
    (resident) => normalizeText(formatPersonName(resident)) === normalizedApplicantName
  );

  if (matchingResident) {
    return matchingResident;
  }

  const { data, error } = await supabase
    .from('residents')
    .insert({
      household_id: household.id,
      barangay_id: barangayId,
      first_name: applicantParts.firstName,
      middle_name: applicantParts.middleName || null,
      last_name: applicantParts.lastName,
      suffix_name: applicantParts.suffixName || null,
      is_head: (residents ?? []).length === 0,
    })
    .select('id, first_name, middle_name, last_name, suffix_name, household_id, barangay_id')
    .single();

  if (error) {
    if (isRowLevelSecurityError(error, 'residents')) {
      const { data: rpcResident, error: rpcError } = await supabase
        .rpc('create_resident_for_intake', {
          target_household_id: household.id,
          target_barangay_id: barangayId,
          target_first_name: applicantParts.firstName,
          target_middle_name: applicantParts.middleName || null,
          target_last_name: applicantParts.lastName,
          target_suffix_name: applicantParts.suffixName || null,
          target_is_head: (residents ?? []).length === 0,
        })
        .single();

      if (!rpcError && rpcResident) {
        return rpcResident;
      }

      const barangayLabel = barangayName || 'the selected barangay';
      throw new Error(
        rpcError?.message
          ? `Your account cannot add residents for ${barangayLabel}: ${rpcError.message}`
          : `Your account cannot add residents for ${barangayLabel}. Ask an administrator to verify your barangay assignment and role access.`
      );
    }

    throw error;
  }

  return data;
}

async function getProgramByCode(programCode) {
  const { data, error } = await supabase
    .from('social_programs')
    .select('id, code, name, category')
    .eq('code', programCode)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Program "${programCode}" was not found in Supabase.`);
  }

  return data;
}

async function getProgramRequirements(programId) {
  const { data, error } = await supabase
    .from('program_requirements')
    .select('id, requirement_code, label, description, document_group, is_required, is_for_household, allowed_file_types, max_file_size_mb, sort_order')
    .eq('program_id', programId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getProgramsWithRequirements() {
  const [{ data: programs, error: programError }, { data: requirements, error: requirementError }] = await Promise.all([
    supabase
      .from('social_programs')
      .select('id, code, name, category, description, eligibility_summary, sort_order')
      .eq('status', 'active')
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('program_requirements')
      .select('id, program_id, requirement_code, label, description, document_group, is_required, is_for_household, allowed_file_types, max_file_size_mb, sort_order')
      .is('archived_at', null)
      .order('sort_order', { ascending: true }),
  ]);

  if (programError) {
    throw programError;
  }

  if (requirementError) {
    throw requirementError;
  }

  return mapProgramsWithRequirements(programs ?? [], requirements ?? []);
}

async function getApplicationAnalyticsRows() {
  const scope = getScopedBarangayScope();
  let query = supabase
    .from('applications')
    .select(`
      current_status,
      submitted_at,
      reviewed_at,
      decided_at,
      created_at,
      barangay_id,
      barangay:barangays(name)
    `)
    .is('archived_at', null);

  if (scope.isScopedRole && scope.barangayId) {
    query = query.eq('barangay_id', scope.barangayId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return filterRowsByScopedBarangay(data ?? [], (row) => row?.barangay?.name);
}

export const supabaseService = {
  setSessionContext(session) {
    sessionContext = session ?? null;
  },

  async getDashboardStats() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();
        const metricParams = scope.isScopedRole
          ? { filter_barangay_id: scope.barangayId }
          : {};

        const [{ data, error }, applicationRows] = await Promise.all([
          supabase.rpc('dashboard_metrics', metricParams),
          getApplicationAnalyticsRows(),
        ]);

        if (error) {
          throw error;
        }

        const metrics = Array.isArray(data) ? data[0] : null;
        const slaBreaches = countPendingSlaBreaches(applicationRows);
        const readyForApproval = (applicationRows ?? []).filter(
          (application) => normalizeWorkflowStatus(application.current_status) === 'verified'
        ).length;

        return [
          {
            label: 'Pending review',
            value: String(metrics?.pending_applications ?? 0),
            trend: 'Currently assigned',
            tone: 'warning',
          },
          {
            label: 'Ready for approval',
            value: String(metrics?.ready_for_approval_applications ?? readyForApproval),
            trend: 'Awaiting admin approval',
            tone: 'accent',
          },
          {
            label: 'Unserved households',
            value: String(metrics?.unserved_households ?? 0),
            trend: 'No recorded assistance',
            tone: 'good',
          },
          {
            label: 'SLA breaches (48h+)',
            value: String(slaBreaches),
            trend: `Pending over ${SLA_HOURS} hours`,
            tone: slaBreaches > 0 ? 'warning' : 'good',
          },
        ];
      },
      demoData.dashboardStats,
      'Failed to load dashboard stats.'
    );
  },

  async getPriorityCases() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();
        let query = supabase
          .from('application_queue_view')
          .select(`
            application_no,
            applicant_name,
            barangay_id,
            barangay_name,
            program_names,
            current_status,
            last_status_at,
            submitted_at
          `)
          .order('last_status_at', { ascending: false, nullsFirst: false })
          .limit(5);

        if (scope.isScopedRole) {
          query = query.eq('barangay_id', scope.barangayId);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const rows = filterRowsByScopedBarangay(data ?? [], (row) => row.barangay_name);

        return rows.map((application) => ({
          reference: application.application_no,
          applicant: application.applicant_name || 'Unknown applicant',
          program: application.program_names || 'Unassigned',
          status: formatStatusLabel(application.current_status),
          tone: statusTone(application.current_status),
          updatedAt: new Date(application.last_status_at || application.submitted_at).toLocaleString(),
        }));
      },
      demoData.priorityCases,
      'Failed to load priority cases.'
    );
  },

  async getApplicationQueue() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();
        let query = supabase
          .from('application_queue_view')
          .select(`
            application_no,
            applicant_name,
            barangay_id,
            barangay_name,
            current_status,
            program_names,
            submitted_at,
            last_status_at
          `)
          .order('submitted_at', { ascending: false, nullsFirst: false });

        if (scope.isScopedRole) {
          query = query.eq('barangay_id', scope.barangayId);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const rows = filterRowsByScopedBarangay(data ?? [], (row) => row.barangay_name);

        return rows.map((application) => ({
          reference: application.application_no,
          applicant: application.applicant_name || 'Unknown applicant',
          barangay: application.barangay_name || 'Unknown barangay',
          program: application.program_names || 'Unassigned',
          status: formatStatusLabel(application.current_status),
          tone: statusTone(application.current_status),
          age: this.calculateAge(application.last_status_at || application.submitted_at),
        }));
      },
      demoData.applicationQueue,
      'Failed to load the application queue.'
    );
  },

  async getApplicationDetails(reference) {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();

        const { data: application, error: applicationError } = await supabase
          .from('applications')
          .select(`
            id,
            application_no,
            current_status,
            submitted_at,
            created_at,
            reviewed_at,
            decided_at,
            review_stage,
            resident_id,
            household_id,
            barangay_id
          `)
          .eq('application_no', reference)
          .maybeSingle();

        if (applicationError) {
          throw applicationError;
        }

        if (!application) {
          throw new Error(`Application "${reference}" was not found in Supabase.`);
        }

        if (scope.isScopedRole && application.barangay_id !== scope.barangayId) {
          throw new Error(`Application "${reference}" was not found in Supabase.`);
        }

        const [
          residentResult,
          householdResult,
          programResult,
          historyResult,
          documentResult,
          noteResult,
        ] = await Promise.all([
          supabase
            .from('residents')
            .select('id, first_name, middle_name, last_name, suffix_name')
            .eq('id', application.resident_id)
            .maybeSingle(),
          supabase
            .from('households')
            .select('id, household_code')
            .eq('id', application.household_id)
            .maybeSingle(),
          supabase
            .from('application_programs')
            .select('program_id, decision_status, program:social_programs(code, name, category)')
            .eq('application_id', application.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('status_history')
            .select('changed_at, from_status, to_status, remarks, changed_by')
            .eq('application_id', application.id)
            .order('changed_at', { ascending: false }),
          supabase
            .from('application_documents')
            .select('id, requirement_id, bucket_name, object_path, file_name, status, remarks, uploaded_at, verified_at')
            .eq('application_id', application.id)
            .is('archived_at', null)
            .order('uploaded_at', { ascending: true }),
          supabase
            .from('internal_notes')
            .select('note_text, created_at')
            .eq('application_id', application.id)
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (residentResult.error) {
          throw residentResult.error;
        }

        if (householdResult.error && householdResult.error.code !== '42501') {
          throw householdResult.error;
        }

        if (programResult.error) {
          throw programResult.error;
        }

        if (historyResult.error) {
          throw historyResult.error;
        }

        if (documentResult.error) {
          throw documentResult.error;
        }

        if (noteResult.error) {
          throw noteResult.error;
        }

        const resident = residentResult.data;
        const household = householdResult.error?.code === '42501' ? null : householdResult.data;
        const programRows = programResult.data ?? [];
        const documentRows = documentResult.data ?? [];
        const historyRows = historyResult.data ?? [];
        const latestNote = noteResult.data?.[0] ?? null;
        const primaryProgram = programRows[0];
        const programId = primaryProgram?.program_id ?? null;
        const requirements = programId ? await getProgramRequirements(programId) : [];
        const documentViewUrlById = await createDocumentViewUrls(documentRows);
        const requirementLabelById = new Map(
          requirements.map((requirement) => [requirement.id, requirement.label])
        );

        const profileLookupIds = [...new Set(historyRows.map((entry) => entry.changed_by).filter(Boolean))];
        let profileLookup = new Map();

        if (profileLookupIds.length) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', profileLookupIds);

          if (profileError) {
            throw profileError;
          }

          profileLookup = new Map(
            (profiles ?? []).map((profile) => [
              profile.id,
              profile.display_name || profile.email || 'MSWD Staff',
            ])
          );
        }

        const uploadedDocumentsByRequirement = new Map();
        for (const document of documentRows) {
          const documentLabel = requirementLabelById.get(document.requirement_id) || document.file_name;
          uploadedDocumentsByRequirement.set(documentLabel, document);
        }

        const documents = [
          ...requirements.map((requirement) => {
            const document = uploadedDocumentsByRequirement.get(requirement.label);

            if (!document) {
              return {
                name: requirement.label,
                status: 'Missing',
                tone: 'warning',
                fileName: null,
              };
            }

            return {
              name: requirement.label,
              status: formatStatusLabel(document.status),
              tone: documentTone(document.status),
              fileName: document.file_name,
              viewUrl: documentViewUrlById.get(document.id) || null,
            };
          }),
          ...documentRows
            .filter((document) => !document.requirement_id || !requirementLabelById.has(document.requirement_id))
            .map((document) => ({
              name: document.file_name,
              status: formatStatusLabel(document.status),
              tone: documentTone(document.status),
              fileName: document.file_name,
              viewUrl: documentViewUrlById.get(document.id) || null,
            })),
        ];

        const missingRequirementCount = documents.filter((document) => normalizeText(document.status) === 'missing').length;
        const uploadedRequirementCount = documents.length - missingRequirementCount;
        const history = historyRows.length
          ? historyRows.map((entry) => ({
              timestamp: new Date(entry.changed_at).toLocaleString(),
              action: entry.from_status
                ? `Status changed to ${formatStatusLabel(entry.to_status)}`
                : `Application created as ${formatStatusLabel(entry.to_status)}`,
              actor: profileLookup.get(entry.changed_by) || 'System',
              note: entry.remarks
                || (
                  entry.from_status
                    ? `Status moved from ${formatStatusLabel(entry.from_status)} to ${formatStatusLabel(entry.to_status)}.`
                    : 'Initial application record was created.'
                ),
            }))
          : [
              {
                timestamp: new Date(application.submitted_at || application.created_at).toLocaleString(),
                action: 'Application created',
                actor: 'System',
                note: 'Initial application record was created.',
              },
            ];

        return {
          reference: application.application_no,
          applicant: resident ? formatPersonName(resident) : 'Unknown applicant',
          household: household?.household_code || 'Unknown household',
          program: primaryProgram?.program?.name || primaryProgram?.program?.code || 'Unassigned',
          status: formatStatusLabel(application.current_status),
          submittedAt: new Date(application.submitted_at || application.created_at).toLocaleString(),
          supportType: primaryProgram?.program?.category || primaryProgram?.program?.name || 'General assistance',
          history,
          checks: [
            {
              title: 'Application status',
              description: `Current workflow status: ${formatStatusLabel(application.current_status)}.`,
              state: application.current_status === 'needs_more_info' ? 'pending' : 'progress',
            },
            {
              title: 'Requirements',
              description: missingRequirementCount
                ? `${missingRequirementCount} required document(s) are still missing.`
                : 'All required documents are already uploaded.',
              state: missingRequirementCount ? 'pending' : 'complete',
            },
            {
              title: 'Processor note',
              description: latestNote?.note_text || 'No internal note was recorded during intake.',
              state: latestNote?.note_text ? 'complete' : 'progress',
            },
          ],
          documents,
          meta: {
            applicationId: application.id,
            currentStatus: application.current_status,
            uploadedRequirementCount,
          },
        };
      },
      () => getDemoApplicationDetail(reference),
      `Failed to load application "${reference}".`
    );
  },

  async transitionApplication({ reference, applicationId, status, remarks, approvedAmount, currentRecord }) {
    const normalizedStatus = normalizeWorkflowStatus(status);
    if (['approved', 'rejected', 'released', 'cancelled'].includes(normalizedStatus)) {
      assertApplicationApprovalAccess();
    }

    if (USE_DEMO) {
      return transitionDemoApplication({ reference, status, remarks, currentRecord });
    }

    return runServiceQuery(
      async () => {
        let targetApplicationId = applicationId;

        if (!targetApplicationId) {
          const { data: application, error: lookupError } = await supabase
            .from('applications')
            .select('id')
            .eq('application_no', reference)
            .maybeSingle();

          if (lookupError) {
            throw lookupError;
          }

          if (!application) {
            throw new Error(`Application "${reference}" was not found in Supabase.`);
          }

          targetApplicationId = application.id;
        }

        const { error } = await supabase.rpc('transition_application_for_review', {
          target_application_id: targetApplicationId,
          target_status: status,
          target_remarks: remarks?.trim() || null,
          target_approved_amount: approvedAmount || null,
        });

        if (error) {
          throw error;
        }

        const detail = await this.getApplicationDetails(reference);
        return {
          detail,
          status: formatStatusLabel(status),
          tone: statusTone(status),
          age: '0h',
        };
      },
      null,
      `Failed to update application "${reference}".`
    );
  },

  async createApplication({
    applicant,
    householdCode,
    barangayName,
    programCode,
    note,
    uploadedRequirements,
  }) {
    assertApplicationCreationAccess();

    if (USE_DEMO) {
      const trimmedApplicant = applicant.trim();
      const trimmedHouseholdCode = householdCode.trim().toUpperCase();
      const demoProgram = demoData.demoPrograms.find((program) => program.code === programCode)
        ?? demoData.demoPrograms[0];
      const reference = getNextDemoApplicationReference(demoProgram?.code || 'AICS');
      const detail = buildDemoApplicationDetail({
        reference,
        applicant: trimmedApplicant,
        householdCode: trimmedHouseholdCode,
        program: demoProgram,
        note,
        uploadedRequirements,
      });

      return {
        queueItem: {
          reference,
          applicant: trimmedApplicant,
          barangay: barangayName,
          program: demoProgram?.name || demoProgram?.code || 'Unassigned',
          status: formatStatusLabel(detail.meta.currentStatus),
          tone: statusTone(detail.meta.currentStatus),
          age: '0h',
        },
        detail,
      };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const scope = getScopedBarangayScope();
    if (scope.isScopedRole) {
      assertBarangayScopeForRead();
    }

    const scopedBarangayName = scope.isScopedRole ? scope.barangayName : null;
    const targetBarangayName = scopedBarangayName || barangayName;
    assertBarangayScopeForWrite(targetBarangayName);

    const user = await getAuthenticatedUser();
    const trimmedApplicant = applicant.trim();
    const trimmedHouseholdCode = householdCode.trim().toUpperCase();

    if (!trimmedApplicant || !trimmedHouseholdCode) {
      throw new Error('Applicant name and household code are required.');
    }

    const barangay = await getBarangayByName(targetBarangayName);
    if (scope.isScopedRole && barangay.id !== scope.barangayId) {
      throw new Error(`Barangay staff can only manage records for ${scope.barangayName}.`);
    }

    const household = await findOrCreateHousehold({
      householdCode: trimmedHouseholdCode,
      barangay,
      applicantName: trimmedApplicant,
    });

    if (!isSameUuid(household.barangay_id, barangay.id)) {
      throw new Error(
        `Household code "${trimmedHouseholdCode}" belongs to another barangay. Select the matching barangay before creating this application.`
      );
    }

    const resident = await findOrCreateResident({
      applicantName: trimmedApplicant,
      household,
      barangayId: household.barangay_id,
      barangayName: barangay.name,
    });
    const program = await getProgramByCode(programCode);
    const requirements = await getProgramRequirements(program.id);
    const uploadedEntries = Object.entries(uploadedRequirements ?? {}).filter(([, meta]) => meta?.file);
    const uploadedRequirementIds = uploadedEntries.map(([requirementId]) => requirementId);
    const missingRequirements = requirements.filter(
      (requirement) => requirement.is_required && !uploadedRequirementIds.includes(requirement.id)
    );
    const applicationStatus = missingRequirements.length ? 'needs_more_info' : 'submitted';

    let { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert({
        resident_id: resident.id,
        household_id: household.id,
        barangay_id: household.barangay_id,
        intake_channel: 'mswd_portal',
        current_status: applicationStatus,
        review_stage: 'intake',
      })
      .select('id, application_no, submitted_at, created_at')
      .single();

    if (applicationError) {
      if (isRowLevelSecurityError(applicationError, 'applications')) {
        const { data: rpcApplication, error: rpcApplicationError } = await supabase
          .rpc('create_application_for_intake', {
            target_resident_id: resident.id,
            target_household_id: household.id,
            target_barangay_id: household.barangay_id,
            target_intake_channel: 'mswd_portal',
            target_current_status: applicationStatus,
            target_review_stage: 'intake',
          })
          .single();

        if (rpcApplicationError) {
          throw rpcApplicationError;
        }

        application = rpcApplication;
      } else {
        throw applicationError;
      }
    }

    const { error: programLinkError } = await supabase
      .from('application_programs')
      .insert({
        application_id: application.id,
        program_id: program.id,
        decision_status: applicationStatus,
      });

    if (programLinkError) {
      if (isRowLevelSecurityError(programLinkError, 'application_programs')) {
        const { error: rpcProgramLinkError } = await supabase.rpc('link_application_program_for_intake', {
          target_application_id: application.id,
          target_program_id: program.id,
          target_decision_status: applicationStatus,
        });

        if (rpcProgramLinkError) {
          throw rpcProgramLinkError;
        }
      } else {
        throw programLinkError;
      }
    }

    if (note?.trim()) {
      const { error: noteError } = await supabase
        .from('internal_notes')
        .insert({
          application_id: application.id,
          visibility: 'internal',
          note_text: note.trim(),
        });

      if (noteError) {
        if (isRowLevelSecurityError(noteError, 'internal_notes')) {
          const { error: rpcNoteError } = await supabase.rpc('add_internal_note_for_intake', {
            target_application_id: application.id,
            target_note_text: note.trim(),
          });

          if (rpcNoteError) {
            throw rpcNoteError;
          }
        } else {
          throw noteError;
        }
      }
    }

    for (const [requirementId, fileMeta] of uploadedEntries) {
      const matchingRequirement = requirements.find((requirement) => requirement.id === requirementId);
      const requirementLabel = matchingRequirement?.label || fileMeta.label || 'Requirement document';
      const objectPath = `${application.id}/${user.id}/${Date.now()}-${sanitizeFileName(fileMeta.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(objectPath, fileMeta.file, {
          contentType: fileMeta.type || fileMeta.file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload "${requirementLabel}": ${uploadError.message}`);
      }

      const { error: documentError } = await supabase
        .from('application_documents')
        .insert({
          application_id: application.id,
          requirement_id: matchingRequirement?.id ?? null,
          resident_id: resident.id,
          object_path: objectPath,
          file_name: fileMeta.name,
          mime_type: fileMeta.type || fileMeta.file.type || null,
          file_size_bytes: fileMeta.size || fileMeta.file.size || null,
          status: 'uploaded',
        });

      if (documentError) {
        if (isRowLevelSecurityError(documentError, 'application_documents')) {
          const { error: rpcDocumentError } = await supabase.rpc('add_application_document_for_intake', {
            target_application_id: application.id,
            target_requirement_id: matchingRequirement?.id ?? null,
            target_resident_id: resident.id,
            target_object_path: objectPath,
            target_file_name: fileMeta.name,
            target_mime_type: fileMeta.type || fileMeta.file.type || null,
            target_file_size_bytes: fileMeta.size || fileMeta.file.size || null,
            target_status: 'uploaded',
          });

          if (rpcDocumentError) {
            throw rpcDocumentError;
          }
        } else {
          throw documentError;
        }
      }
    }

    const detail = await this.getApplicationDetails(application.application_no);

    return {
      queueItem: {
        reference: application.application_no,
        applicant: trimmedApplicant,
        barangay: barangay.name,
        program: program.name || program.code,
        status: formatStatusLabel(applicationStatus),
        tone: statusTone(applicationStatus),
        age: this.calculateAge(application.submitted_at || application.created_at),
      },
      detail,
    };
  },

  async getHouseholds() {
    assertHouseholdReadAccess();

    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();
        let query = supabase
          .from('households')
          .select(`
            id,
            household_code,
            household_name,
            barangay_id,
            address_line1,
            purok_sitio,
            postal_code,
            monthly_income,
            poverty_level,
            barangay:barangays(name),
            household_size
          `)
          .is('archived_at', null)
          .order('household_code', { ascending: true })
          .limit(100);

        if (scope.isScopedRole) {
          query = query.eq('barangay_id', scope.barangayId);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const rows = filterRowsByScopedBarangay(data ?? [], (row) => row?.barangay?.name);

        if (!rows.length) {
          return [];
        }

        const householdIds = rows.map((household) => household.id).filter(Boolean);
        const householdCodeById = new Map(
          rows.map((household) => [household.id, household.household_code])
        );
        const [assistanceResult, applicationResult] = await Promise.all([
          supabase
            .from('assistance_records')
            .select('household_id, status, assistance_type, program:social_programs(name, code)')
            .in('household_id', householdIds)
            .is('archived_at', null)
            .in('status', ['approved', 'released']),
          supabase
            .from('applications')
            .select(`
              household_id,
              current_status,
              application_programs(
                decision_status,
                program:social_programs(name, code)
              )
            `)
            .in('household_id', householdIds)
            .is('archived_at', null)
            .neq('current_status', 'draft'),
        ]);

        if (assistanceResult.error) {
          throw assistanceResult.error;
        }

        if (applicationResult.error) {
          throw applicationResult.error;
        }

        const availedProgramsByCode = new Map();
        for (const assistance of assistanceResult.data ?? []) {
          const code = householdCodeById.get(assistance.household_id);
          const programName = assistance.program?.name || assistance.program?.code || assistance.assistance_type;
          if (code && programName) {
            const currentPrograms = availedProgramsByCode.get(code) ?? new Set();
            currentPrograms.add(programName);
            availedProgramsByCode.set(code, currentPrograms);
          }
        }

        for (const application of applicationResult.data ?? []) {
          const code = householdCodeById.get(application.household_id);
          if (!code) {
            continue;
          }

          const linkedPrograms = application.application_programs?.length
            ? application.application_programs
            : [null];

          for (const linkedProgram of linkedPrograms) {
            const workflowStatus = normalizeWorkflowStatus(
              linkedProgram?.decision_status || application.current_status
            );
            if (['rejected', 'cancelled', 'draft'].includes(workflowStatus)) {
              continue;
            }

            const programName = linkedProgram?.program?.name || linkedProgram?.program?.code;
            if (!programName) {
              continue;
            }

            const currentPrograms = availedProgramsByCode.get(code) ?? new Set();
            currentPrograms.add(programName);
            availedProgramsByCode.set(code, currentPrograms);
          }
        }

        return rows.map((household) => ({
          availProgramsCount: (availedProgramsByCode.get(household.household_code) ?? new Set()).size,
          code: household.household_code,
          head: household.household_name || 'Registered household',
          barangay: household.barangay?.name || 'Unknown barangay',
          members: String(household.household_size ?? 1),
          purokSitio: household.purok_sitio || '',
          addressLine1: household.address_line1 || '',
          postalCode: household.postal_code || '',
          monthlyIncome: household.monthly_income != null ? String(household.monthly_income) : '',
          povertyLevel: household.poverty_level || '',
          openCases: '0',
          availPrograms: [...(availedProgramsByCode.get(household.household_code) ?? [])]
            .sort((left, right) => left.localeCompare(right))
            .join(', ') || 'None recorded',
        }));
      },
      () => {
        const programsByHouseholdCode = new Map();
        for (const detail of Object.values(demoData.applicationCaseDetails ?? {})) {
          const householdCode = detail?.household;
          const programName = detail?.program;
          if (!householdCode || !programName) {
            continue;
          }
          const set = programsByHouseholdCode.get(householdCode) ?? new Set();
          set.add(programName);
          programsByHouseholdCode.set(householdCode, set);
        }

        return (demoData.householdRows ?? []).map((household) => ({
          availProgramsCount: (programsByHouseholdCode.get(household.code) ?? new Set()).size,
          ...household,
          availPrograms: [...(programsByHouseholdCode.get(household.code) ?? [])]
            .sort((left, right) => left.localeCompare(right))
            .join(', ') || 'None recorded',
        }));
      },
      'Failed to load households.'
    );
  },

  async getHouseholdDetails(code, row = null) {
    assertHouseholdReadAccess();

    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();

        const { data: household, error: householdError } = await supabase
          .from('households')
          .select(`
            id,
            household_code,
            household_name,
            household_size,
            barangay_id,
            address_line1,
            address_line2,
            purok_sitio,
            postal_code,
            monthly_income,
            poverty_level,
            status,
            barangay:barangays(name)
          `)
          .eq('household_code', code)
          .is('archived_at', null)
          .maybeSingle();

        if (householdError) {
          throw householdError;
        }

        if (!household) {
          throw new Error(`Household "${code}" was not found in Supabase.`);
        }

        if (scope.isScopedRole && household.barangay_id !== scope.barangayId) {
          throw new Error(`Household "${code}" was not found in Supabase.`);
        }

        const [applicationsResult, applicationHistoryResult, assistanceResult] = await Promise.all([
          supabase
            .from('applications')
            .select('id')
            .eq('household_id', household.id)
            .is('archived_at', null)
            .in('current_status', [...PENDING_APPLICATION_STATUSES, 'approved']),
          supabase
            .from('applications')
            .select(`
              id,
              application_no,
              current_status,
              submitted_at,
              reviewed_at,
              decided_at,
              updated_at,
              created_at,
              application_programs(
                decision_status,
                decision_notes,
                approved_amount,
                updated_at,
                program:social_programs(name)
              )
            `)
            .eq('household_id', household.id)
            .is('archived_at', null)
            .neq('current_status', 'draft')
            .order('updated_at', { ascending: false })
            .limit(8),
          supabase
            .from('assistance_records')
            .select(`
              assistance_type,
              amount,
              remarks,
              status,
              approved_at,
              released_at,
              created_at,
              program:social_programs(name)
            `)
            .eq('household_id', household.id)
            .is('archived_at', null)
            .order('released_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(8),
        ]);

        if (applicationsResult.error) {
          throw applicationsResult.error;
        }

        if (applicationHistoryResult.error) {
          throw applicationHistoryResult.error;
        }

        if (assistanceResult.error) {
          throw assistanceResult.error;
        }

        const openCases = String((applicationsResult.data ?? []).length);
        const assistanceRows = assistanceResult.data ?? [];
        const applicationHistoryRows = applicationHistoryResult.data ?? [];
        const address = [
          household.purok_sitio,
          household.address_line1,
          household.address_line2,
          household.barangay?.name,
          'Barbaza',
          'Antique',
        ]
          .filter(Boolean)
          .join(', ');
        const assistanceHistory = assistanceRows.map((entry) => {
          const eventDate = entry.released_at || entry.approved_at || entry.created_at;
          const statusLabel = formatStatusLabel(entry.status || 'recorded');
          const amountText = entry.amount != null ? ` (${formatCurrency(entry.amount)})` : '';

          return {
            timestamp: eventDate,
            date: formatDateLabel(eventDate),
            program: entry.program?.name || entry.assistance_type || 'Assistance',
            details: entry.remarks || `${statusLabel} assistance transaction${amountText}.`,
            isAssistanceEvent: true,
          };
        });
        const applicationHistory = applicationHistoryRows.flatMap((application) => {
          const programRows = application.application_programs?.length
            ? application.application_programs
            : [null];
          const eventDate = application.decided_at
            || application.reviewed_at
            || application.updated_at
            || application.submitted_at
            || application.created_at;

          return programRows.map((programRow) => {
            const status = programRow?.decision_status || application.current_status;
            const programName = programRow?.program?.name || 'Application';
            const amountText = programRow?.approved_amount != null
              ? ` Approved amount: ${formatCurrency(programRow.approved_amount)}.`
              : '';

            return {
              timestamp: eventDate,
              date: formatDateLabel(eventDate),
              program: `${programName} ${formatStatusLabel(status)}`,
              details: programRow?.decision_notes
                || `Application ${application.application_no} is ${formatStatusLabel(application.current_status)}.${amountText}`,
              isAssistanceEvent: APPROVED_APPLICATION_STATUSES.includes(application.current_status),
            };
          });
        });
        const history = [...assistanceHistory, ...applicationHistory]
          .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
          .slice(0, 8);
        const latestAssistance = history.find((entry) => entry.isAssistanceEvent);

        return {
          profile: [
            { label: 'Household code', value: household.household_code },
            { label: 'Head of family', value: household.household_name || 'Registered household' },
            { label: 'Barangay', value: household.barangay?.name || 'Unknown barangay' },
            { label: 'Address', value: address || 'Pending address confirmation' },
            { label: 'Members', value: String(household.household_size ?? 1) },
            { label: 'Open cases', value: openCases },
            {
              label: 'Last assistance',
              value: latestAssistance
                ? `${latestAssistance.program} on ${latestAssistance.date}`
                : 'No recorded assistance',
            },
          ],
          history,
        };
      },
      () => buildDemoHouseholdDetails(code, row),
      `Failed to load household "${code}".`
    );
  },

  async getHouseholdProgramMapData() {
    assertHouseholdReadAccess();

    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();

        let householdQuery = supabase
          .from('households')
          .select(`
            id,
            household_code,
            household_name,
            barangay_id,
            address_line1,
            address_line2,
            purok_sitio,
            latitude,
            longitude,
            barangay:barangays(name)
          `)
          .is('archived_at', null)
          .order('household_code', { ascending: true })
          .limit(2000);

        if (scope.isScopedRole) {
          householdQuery = householdQuery.eq('barangay_id', scope.barangayId);
        }

        const { data: householdRows, error: householdError } = await householdQuery;

        if (householdError) {
          throw householdError;
        }

        const scopedRows = filterRowsByScopedBarangay(householdRows ?? [], (row) => row?.barangay?.name);
        if (!scopedRows.length) {
          return {
            rows: [],
            missingCoordinates: [],
            scope: {
              isScoped: Boolean(scope.isScopedRole),
              barangayName: scope.barangayName || null,
            },
          };
        }

        const householdIds = scopedRows.map((row) => row.id).filter(Boolean);
        const [assistanceResult, applicationResult] = await Promise.all([
          supabase
            .from('assistance_records')
            .select('household_id, status, program:social_programs(code, name)')
            .in('household_id', householdIds)
            .is('archived_at', null)
            .in('status', ['approved', 'released']),
          supabase
            .from('applications')
            .select(`
              household_id,
              current_status,
              application_programs(
                decision_status,
                program:social_programs(code, name)
              )
            `)
            .in('household_id', householdIds)
            .is('archived_at', null)
            .in('current_status', ['approved', 'released']),
        ]);

        if (assistanceResult.error) {
          throw assistanceResult.error;
        }

        if (applicationResult.error) {
          throw applicationResult.error;
        }

        const programsByHouseholdId = new Map();

        for (const record of assistanceResult.data ?? []) {
          const householdId = record.household_id;
          const programName = normalizeProgramDisplayName(record.program);
          if (!householdId || !programName) {
            continue;
          }

          const bucket = programsByHouseholdId.get(householdId) ?? new Set();
          bucket.add(programName);
          programsByHouseholdId.set(householdId, bucket);
        }

        for (const application of applicationResult.data ?? []) {
          const householdId = application.household_id;
          if (!householdId) {
            continue;
          }

          const programs = application.application_programs ?? [];
          if (!programs.length) {
            continue;
          }

          const bucket = programsByHouseholdId.get(householdId) ?? new Set();
          for (const programRow of programs) {
            const decisionStatus = normalizeWorkflowStatus(programRow?.decision_status || application.current_status);
            if (!['approved', 'released'].includes(decisionStatus)) {
              continue;
            }

            bucket.add(normalizeProgramDisplayName(programRow?.program));
          }
          programsByHouseholdId.set(householdId, bucket);
        }

        const rows = [];
        const missingCoordinates = [];

        for (const household of scopedRows) {
          const latitude = normalizeCoordinate(household.latitude);
          const longitude = normalizeCoordinate(household.longitude);
          const programs = [...(programsByHouseholdId.get(household.id) ?? [])].sort((left, right) =>
            left.localeCompare(right)
          );
          const fullAddress = [
            household.purok_sitio,
            household.address_line1,
            household.address_line2,
            household.barangay?.name,
            'Barbaza',
            'Antique',
          ].filter(Boolean).join(', ');

          const normalizedRow = {
            code: household.household_code,
            head: household.household_name || 'Registered household',
            barangay: household.barangay?.name || 'Unknown barangay',
            purokSitio: household.purok_sitio || '',
            addressLine1: household.address_line1 || '',
            fullAddress: fullAddress || 'Address pending update',
            programs,
          };

          if (latitude == null || longitude == null) {
            missingCoordinates.push(normalizedRow);
            continue;
          }

          rows.push({
            ...normalizedRow,
            latitude,
            longitude,
          });
        }

        return {
          rows,
          missingCoordinates,
          scope: {
            isScoped: Boolean(scope.isScopedRole),
            barangayName: scope.barangayName || null,
          },
        };
      },
      () => buildDemoHouseholdProgramMapRows(),
      'Failed to load household map data.'
    );
  },

  async createHousehold({
    code,
    head,
    barangay,
    members,
    purokSitio,
    addressLine1,
    postalCode,
    monthlyIncome,
    povertyLevel,
  }) {
    assertHouseholdManagementAccess();

    if (USE_DEMO) {
      return {
        code: code.trim().toUpperCase(),
        head: head.trim(),
        barangay: barangay.trim(),
        members: String(members),
        purokSitio: purokSitio?.trim() || '',
        addressLine1: addressLine1?.trim() || '',
        postalCode: postalCode?.trim() || '',
        monthlyIncome: monthlyIncome?.trim() || '',
        povertyLevel: povertyLevel?.trim() || '',
        openCases: '0',
        availProgramsCount: 0,
        availPrograms: 'None recorded',
      };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const scope = getScopedBarangayScope();
    if (scope.isScopedRole) {
      assertBarangayScopeForRead();
    }

    const targetBarangayName = scope.isScopedRole ? scope.barangayName : barangay;
    assertBarangayScopeForWrite(targetBarangayName);

    const selectedBarangay = await getBarangayByName(targetBarangayName);
    if (scope.isScopedRole && selectedBarangay.id !== scope.barangayId) {
      throw new Error(`Barangay staff can only manage records for ${scope.barangayName}.`);
    }

    const householdCode = code.trim().toUpperCase();
    const { error } = await supabase
      .from('households')
      .insert({
        household_code: householdCode,
        barangay_id: selectedBarangay.id,
        household_name: head.trim(),
        address_line1: addressLine1?.trim() || 'Pending address confirmation',
        purok_sitio: purokSitio?.trim() || null,
        postal_code: postalCode?.trim() || null,
        registration_source: 'mswd_portal',
        household_size: Number(members),
        monthly_income: monthlyIncome ? Number(monthlyIncome) : null,
        poverty_level: povertyLevel?.trim() || null,
      });

    if (error) {
      throw error;
    }

    const rows = await this.getHouseholds();
    return rows.find((item) => item.code === householdCode) ?? {
      code: householdCode,
      head: head.trim(),
      barangay: selectedBarangay.name,
      members: String(members),
      purokSitio: purokSitio?.trim() || '',
      addressLine1: addressLine1?.trim() || '',
      postalCode: postalCode?.trim() || '',
      monthlyIncome: monthlyIncome?.trim() || '',
      povertyLevel: povertyLevel?.trim() || '',
      openCases: '0',
      availProgramsCount: 0,
      availPrograms: 'None recorded',
    };
  },

  async updateHousehold({
    code,
    head,
    barangay,
    members,
    purokSitio,
    addressLine1,
    postalCode,
    monthlyIncome,
    povertyLevel,
  }) {
    assertHouseholdManagementAccess();

    if (USE_DEMO) {
      return {
        code: code.trim().toUpperCase(),
        head: head.trim(),
        barangay: barangay.trim(),
        members: String(members),
        purokSitio: purokSitio?.trim() || '',
        addressLine1: addressLine1?.trim() || '',
        postalCode: postalCode?.trim() || '',
        monthlyIncome: monthlyIncome?.trim() || '',
        povertyLevel: povertyLevel?.trim() || '',
        openCases: '0',
        availProgramsCount: 0,
        availPrograms: 'None recorded',
      };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const scope = getScopedBarangayScope();
    if (scope.isScopedRole) {
      assertBarangayScopeForRead();
    }

    const targetBarangayName = scope.isScopedRole ? scope.barangayName : barangay;
    assertBarangayScopeForWrite(targetBarangayName);

    const selectedBarangay = await getBarangayByName(targetBarangayName);
    if (scope.isScopedRole && selectedBarangay.id !== scope.barangayId) {
      throw new Error(`Barangay staff can only manage records for ${scope.barangayName}.`);
    }

    const householdCode = code.trim().toUpperCase();
    let updateQuery = supabase
      .from('households')
      .update({
        barangay_id: selectedBarangay.id,
        household_name: head.trim(),
        household_size: Number(members),
        address_line1: addressLine1?.trim() || 'Pending address confirmation',
        purok_sitio: purokSitio?.trim() || null,
        postal_code: postalCode?.trim() || null,
        monthly_income: monthlyIncome ? Number(monthlyIncome) : null,
        poverty_level: povertyLevel?.trim() || null,
      })
      .eq('household_code', householdCode)
      .is('archived_at', null);

    if (scope.isScopedRole) {
      updateQuery = updateQuery.eq('barangay_id', scope.barangayId);
    }

    const { error } = await updateQuery;

    if (error) {
      throw error;
    }

    const rows = await this.getHouseholds();
    return rows.find((item) => item.code === householdCode) ?? {
      code: householdCode,
      head: head.trim(),
      barangay: selectedBarangay.name,
      members: String(members),
      purokSitio: purokSitio?.trim() || '',
      addressLine1: addressLine1?.trim() || '',
      postalCode: postalCode?.trim() || '',
      monthlyIncome: monthlyIncome?.trim() || '',
      povertyLevel: povertyLevel?.trim() || '',
      openCases: '0',
      availProgramsCount: 0,
      availPrograms: 'None recorded',
    };
  },

  async deleteHousehold(code) {
    assertHouseholdManagementAccess();

    if (USE_DEMO) {
      return { success: true };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const scope = getScopedBarangayScope();
    if (scope.isScopedRole) {
      assertBarangayScopeForRead();
    }

    let deleteQuery = supabase
      .from('households')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('household_code', code)
      .is('archived_at', null);

    if (scope.isScopedRole) {
      deleteQuery = deleteQuery.eq('barangay_id', scope.barangayId);
    }

    const { error } = await deleteQuery;

    if (error) {
      throw error;
    }

    return { success: true };
  },

  async getChartData() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();
        const breakdownParams = scope.isScopedRole
          ? { filter_barangay_id: scope.barangayId }
          : {};

        const [applicationRows, breakdownRows] = await Promise.all([
          getApplicationAnalyticsRows(),
          supabase.rpc('beneficiary_breakdown_by_program', breakdownParams).then(({ data, error }) => {
            if (error) {
              throw error;
            }

            return data ?? [];
          }),
        ]);

        const chartData = {
          monthlyApprovals: buildMonthlyApprovals(applicationRows),
          programBreakdown: {
            labels: breakdownRows.map((row) => row.program_name || row.program_code),
            values: breakdownRows.map((row) => Number(row.beneficiary_households ?? 0)),
          },
          workloadByBarangay: buildWorkloadByBarangay(applicationRows),
          slaTrend: buildSlaTrend(applicationRows),
        };

        if (!hasChartDataSignal(chartData)) {
          if (scope.isScopedRole) {
            return {
              monthlyApprovals: buildMonthlyApprovals([]),
              programBreakdown: {
                labels: [],
                values: [],
              },
              workloadByBarangay: scope.barangayName
                ? [{ barangay: scope.barangayName, pending: 0, approved: 0 }]
                : [],
              slaTrend: buildSlaTrend([]),
            };
          }

          return {
            monthlyApprovals: buildMonthlyApprovals([]),
            programBreakdown: {
              labels: [],
              values: [],
            },
            workloadByBarangay: [],
            slaTrend: buildSlaTrend([]),
          };
        }

        return chartData;
      },
      {
        monthlyApprovals: demoData.monthlyApprovals,
        programBreakdown: demoData.programBreakdown,
        workloadByBarangay: demoData.workloadByBarangay,
        slaTrend: demoData.slaTrend,
      },
      'Failed to load analytics charts.'
    );
  },

  async getReportsSummary() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();

        let applicationsQuery = supabase
          .from('applications')
          .select('current_status, submitted_at, created_at, reviewed_at, decided_at, barangay_id')
          .is('archived_at', null);

        let assistanceQuery = supabase
          .from('assistance_records')
          .select('amount, status, released_at, created_at, barangay_id')
          .is('archived_at', null);

        if (scope.isScopedRole) {
          applicationsQuery = applicationsQuery.eq('barangay_id', scope.barangayId);
          assistanceQuery = assistanceQuery.eq('barangay_id', scope.barangayId);
        }

        const [applicationRows, assistanceRows] = await Promise.all([
          applicationsQuery.then(({ data, error }) => {
              if (error) {
                throw error;
              }

              return data ?? [];
            }),
          assistanceQuery.then(({ data, error }) => {
              if (error) {
                throw error;
              }

              return data ?? [];
            }),
        ]);

        const agedBeyondSla = countPendingSlaBreaches(applicationRows);

        const approvalsThisMonth = applicationRows.filter((application) => {
          if (!APPROVED_APPLICATION_STATUSES.includes(application.current_status)) {
            return false;
          }

          const approvalDate = getReferenceDate(
            application.decided_at,
            application.reviewed_at,
            application.submitted_at,
            application.created_at
          );

          return approvalDate ? isCurrentMonth(approvalDate) : false;
        }).length;

        const releasedAssistanceAmount = assistanceRows.reduce((total, row) => {
          if (row.status !== 'released') {
            return total;
          }

          const releaseDate = getReferenceDate(row.released_at, row.created_at);
          if (!releaseDate || !isCurrentMonth(releaseDate)) {
            return total;
          }

          return total + Number(row.amount ?? 0);
        }, 0);

        return [
          {
            label: 'Aged beyond SLA',
            value: String(agedBeyondSla),
            trend: `Pending more than ${SLA_HOURS} hours`,
            tone: agedBeyondSla ? 'warning' : 'good',
          },
          {
            label: 'Approvals this month',
            value: String(approvalsThisMonth),
            trend: 'Current month approvals and releases',
            tone: 'good',
          },
          {
            label: 'Released assistance',
            value: formatCurrency(releasedAssistanceAmount),
            trend: 'Current month released amount',
            tone: 'accent',
          },
        ];
      },
      demoData.reportStats,
      'Failed to load reporting highlights.'
    );
  },

  async getHouseholdAnalytics() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();

        let householdsQuery = supabase
          .from('households')
          .select('id, household_code, barangay_id, household_size, monthly_income, barangay:barangays(name)')
          .is('archived_at', null);

        if (scope.isScopedRole) {
          householdsQuery = householdsQuery.eq('barangay_id', scope.barangayId);
        }

        const { data, error } = await householdsQuery;

        if (error) {
          throw error;
        }

        const rows = filterRowsByScopedBarangay(data ?? [], (row) => row?.barangay?.name);
        const totalHouseholds = rows.length;
        const totalResidents = rows.reduce((sum, row) => sum + Number(row.household_size ?? 1), 0);

        const tierCounts = { no_income: 0, low_income: 0, moderate: 0, above_moderate: 0 };
        const barangayLowIncome = {};

        for (const row of rows) {
          const income = Number(row.monthly_income ?? 0);
          const barangay = row.barangay?.name || 'Unknown';
          let tierKey;
          if (income === 0) tierKey = 'no_income';
          else if (income < 10000) tierKey = 'low_income';
          else if (income < 20000) tierKey = 'moderate';
          else tierKey = 'above_moderate';

          tierCounts[tierKey] = (tierCounts[tierKey] ?? 0) + 1;

          if (tierKey === 'no_income' || tierKey === 'low_income') {
            if (!barangayLowIncome[barangay]) {
              barangayLowIncome[barangay] = { barangay, noIncome: 0, lowIncome: 0, total: 0 };
            }
            if (tierKey === 'no_income') barangayLowIncome[barangay].noIncome += 1;
            else barangayLowIncome[barangay].lowIncome += 1;
            barangayLowIncome[barangay].total += 1;
          }
        }

        const tupadPriority = tierCounts.no_income + tierCounts.low_income;
        const total = totalHouseholds || 1;

        const classificationBreakdown = [
          { key: 'no_income',      label: 'No Income / No Work', count: tierCounts.no_income,     percentage: Math.round((tierCounts.no_income     / total) * 100) },
          { key: 'low_income',     label: 'Low Income',           count: tierCounts.low_income,    percentage: Math.round((tierCounts.low_income    / total) * 100) },
          { key: 'moderate',       label: 'Moderate Income',      count: tierCounts.moderate,      percentage: Math.round((tierCounts.moderate      / total) * 100) },
          { key: 'above_moderate', label: 'Above Moderate',       count: tierCounts.above_moderate, percentage: Math.round((tierCounts.above_moderate / total) * 100) },
        ];

        const lowIncomeByBarangay = Object.values(barangayLowIncome)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        return {
          summary: {
            totalResidents,
            totalHouseholds,
            tupadPriorityHouseholds: tupadPriority,
            indigentHouseholds: tierCounts.no_income,
          },
          classificationBreakdown,
          lowIncomeByBarangay,
        };
      },
      {
        summary: demoData.householdRegistrySummary,
        classificationBreakdown: demoData.incomeClassificationBreakdown,
        lowIncomeByBarangay: demoData.lowIncomeByBarangay,
      },
      'Failed to load household analytics.'
    );
  },

  calculateAge(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));

    if (hours < 24) {
      return `${hours}h`;
    }

    return `${Math.floor(hours / 24)}d`;
  },

  async getApplicationsByProgram() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        assertBarangayScopeForRead();

        // applications → application_programs (junction) → social_programs
        const { data, error } = await supabase
          .from('application_programs')
          .select(`
            decision_status,
            program:social_programs(name, code),
            application:applications!inner(current_status, barangay_id, archived_at, barangay:barangays(name))
          `);

        if (error) {
          throw error;
        }

        const rows = (data ?? []).filter((row) => !row.application?.archived_at);

        const scopedRows = scope.isScopedRole
          ? rows.filter((row) => {
              const name = row.application?.barangay?.name ?? '';
              return normalizeText(name) === normalizeText(scope.barangayName ?? '');
            })
          : rows;

        const programMap = {};

        for (const row of scopedRows) {
          const programName = row.program?.name || row.program?.code || 'Other';
          if (!programMap[programName]) {
            programMap[programName] = { program: programName, total: 0, pending: 0, approved: 0, released: 0 };
          }
          programMap[programName].total += 1;
          const status = normalizeWorkflowStatus(row.decision_status || row.application?.current_status);
          if (['submitted', 'under_review', 'needs_more_info', 'verified'].includes(status)) {
            programMap[programName].pending += 1;
          } else if (status === 'approved') {
            programMap[programName].approved += 1;
          } else if (status === 'released') {
            programMap[programName].released += 1;
          }
        }

        return Object.values(programMap).sort((a, b) => b.total - a.total);
      },
      demoData.applicationsByProgram,
      'Failed to load applications by program.'
    );
  },

  async getBarangays() {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        if (scope.isScopedRole) {
          assertBarangayScopeForRead();
        }

        let query = supabase
          .from('barangays')
          .select('id, code, name')
          .is('archived_at', null)
          .order('name', { ascending: true });

        if (scope.isScopedRole) {
          query = query.eq('id', scope.barangayId);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const rows = filterRowsByScopedBarangay(data ?? [], (row) => row.name);
        return rows.map((row) => ({
          id: row.id || null,
          code: row.code,
          name: row.name,
        }));
      },
      demoData.barbazaBarangays,
      'Failed to load barangays.'
    );
  },

  async getPrograms() {
    return runServiceQuery(
      async () => getProgramsWithRequirements(),
      demoData.demoPrograms,
      'Failed to load social programs.'
    );
  },

  async getProgramCatalog() {
    return runServiceQuery(
      async () => {
        const [{ data: programs, error: programError }, { data: requirements, error: requirementError }] = await Promise.all([
          supabase
            .from('social_programs')
            .select(`
              id,
              code,
              name,
              category,
              description,
              eligibility_summary,
              status,
              requires_review,
              max_active_applications_per_household,
              allow_multiple_household_beneficiaries,
              sort_order
            `)
            .is('archived_at', null)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true }),
          supabase
            .from('program_requirements')
            .select(`
              id,
              program_id,
              requirement_code,
              label,
              description,
              document_group,
              is_required,
              is_for_household,
              allowed_file_types,
              max_file_size_mb,
              sort_order
            `)
            .is('archived_at', null)
            .order('sort_order', { ascending: true }),
        ]);

        if (programError) {
          throw programError;
        }

        if (requirementError) {
          throw requirementError;
        }

        return mapProgramsWithRequirements(programs ?? [], requirements ?? []);
      },
      demoData.demoPrograms,
      'Failed to load program settings.'
    );
  },

  async saveProgramConfig(programConfig) {
    if (USE_DEMO) {
      return {
        id: programConfig.id || `demo-program-${Date.now()}`,
        code: programConfig.code.trim().toUpperCase(),
        name: programConfig.name.trim(),
        category: programConfig.category.trim(),
        description: programConfig.description?.trim() || '',
        eligibility_summary: programConfig.eligibilitySummary?.trim() || '',
        status: programConfig.status || 'draft',
        requires_review: Boolean(programConfig.requiresReview),
        max_active_applications_per_household: Number(programConfig.maxActiveApplicationsPerHousehold) || 1,
        allow_multiple_household_beneficiaries: Boolean(programConfig.allowMultipleHouseholdBeneficiaries),
        sort_order: Number(programConfig.sortOrder) || 0,
        supportLabel: programConfig.category.trim() || programConfig.name.trim() || programConfig.code.trim().toUpperCase(),
        requirements: (programConfig.requirements ?? []).map((requirement, index) => ({
          id: requirement.id || `demo-requirement-${Date.now()}-${index}`,
          requirement_code: normalizeRequirementCode(requirement.requirementCode, requirement.label) || `REQUIREMENT_${index + 1}`,
          label: requirement.label.trim(),
          description: requirement.description?.trim() || '',
          document_group: requirement.documentGroup?.trim() || '',
          is_required: Boolean(requirement.isRequired),
          is_for_household: Boolean(requirement.isForHousehold),
          allowed_file_types: normalizeFileTypeList(requirement.allowedFileTypes),
          max_file_size_mb: Number(requirement.maxFileSizeMb) || 10,
          sort_order: Number(requirement.sortOrder) || (index + 1) * 10,
        })),
      };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const normalizedProgram = {
      code: programConfig.code.trim().toUpperCase(),
      name: programConfig.name.trim(),
      category: programConfig.category.trim(),
      description: programConfig.description?.trim() || null,
      eligibility_summary: programConfig.eligibilitySummary?.trim() || null,
      status: programConfig.status || 'draft',
      requires_review: Boolean(programConfig.requiresReview),
      max_active_applications_per_household: Math.max(1, Number(programConfig.maxActiveApplicationsPerHousehold) || 1),
      allow_multiple_household_beneficiaries: Boolean(programConfig.allowMultipleHouseholdBeneficiaries),
      sort_order: Number(programConfig.sortOrder) || 0,
    };

    if (!normalizedProgram.code || !normalizedProgram.name) {
      throw new Error('Program code and program name are required.');
    }

    const normalizedRequirements = (programConfig.requirements ?? [])
      .map((requirement, index) => ({
        id: requirement.id || null,
        requirement_code: normalizeRequirementCode(requirement.requirementCode, requirement.label) || `REQUIREMENT_${index + 1}`,
        label: requirement.label?.trim() || '',
        description: requirement.description?.trim() || null,
        document_group: requirement.documentGroup?.trim() || null,
        is_required: Boolean(requirement.isRequired),
        is_for_household: Boolean(requirement.isForHousehold),
        allowed_file_types: normalizeFileTypeList(requirement.allowedFileTypes),
        max_file_size_mb: Math.max(1, Number(requirement.maxFileSizeMb) || 10),
        sort_order: Number(requirement.sortOrder) || (index + 1) * 10,
      }))
      .filter((requirement) => requirement.label);

    let savedProgram;

    if (programConfig.id) {
      const { data, error } = await supabase
        .from('social_programs')
        .update(normalizedProgram)
        .eq('id', programConfig.id)
        .is('archived_at', null)
        .select('id, code')
        .single();

      if (error) {
        throw error;
      }

      savedProgram = data;
    } else {
      const { data, error } = await supabase
        .from('social_programs')
        .insert(normalizedProgram)
        .select('id, code')
        .single();

      if (error) {
        throw error;
      }

      savedProgram = data;
    }

    const existingRequirements = await getProgramRequirements(savedProgram.id);
    const retainedRequirementIds = [];

    for (const requirement of normalizedRequirements) {
      if (requirement.id) {
        const { error } = await supabase
          .from('program_requirements')
          .update({
            requirement_code: requirement.requirement_code,
            label: requirement.label,
            description: requirement.description,
            document_group: requirement.document_group,
            is_required: requirement.is_required,
            is_for_household: requirement.is_for_household,
            allowed_file_types: requirement.allowed_file_types,
            max_file_size_mb: requirement.max_file_size_mb,
            sort_order: requirement.sort_order,
          })
          .eq('id', requirement.id)
          .eq('program_id', savedProgram.id)
          .is('archived_at', null);

        if (error) {
          throw error;
        }

        retainedRequirementIds.push(requirement.id);
        continue;
      }

      const { data, error } = await supabase
        .from('program_requirements')
        .insert({
          program_id: savedProgram.id,
          requirement_code: requirement.requirement_code,
          label: requirement.label,
          description: requirement.description,
          document_group: requirement.document_group,
          is_required: requirement.is_required,
          is_for_household: requirement.is_for_household,
          allowed_file_types: requirement.allowed_file_types,
          max_file_size_mb: requirement.max_file_size_mb,
          sort_order: requirement.sort_order,
        })
        .select('id')
        .single();

        if (error) {
          throw error;
        }

        retainedRequirementIds.push(data.id);
      }

    const requirementIdsToArchive = existingRequirements
      .map((requirement) => requirement.id)
      .filter((id) => !retainedRequirementIds.includes(id));

    if (requirementIdsToArchive.length) {
      const { error } = await supabase
        .from('program_requirements')
        .update({ archived_at: new Date().toISOString() })
        .in('id', requirementIdsToArchive)
        .eq('program_id', savedProgram.id);

      if (error) {
        throw error;
      }
    }

    const catalog = await this.getProgramCatalog();
    return catalog.find((program) => program.id === savedProgram.id) ?? null;
  },

  async archiveProgram(programId) {
    if (USE_DEMO) {
      return { success: true };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const archivedAt = new Date().toISOString();
    const { error: programError } = await supabase
      .from('social_programs')
      .update({
        status: 'archived',
        archived_at: archivedAt,
      })
      .eq('id', programId);

    if (programError) {
      throw programError;
    }

    const { error: requirementError } = await supabase
      .from('program_requirements')
      .update({ archived_at: archivedAt })
      .eq('program_id', programId)
      .is('archived_at', null);

    if (requirementError) {
      throw requirementError;
    }

    return { success: true };
  },

  async getRoles() {
    return runServiceQuery(
      async () => {
        const { data, error } = await supabase
          .from('roles')
          .select('key, name, description')
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        return data ?? [];
      },
      demoData.userRoles,
      'Failed to load roles.'
    );
  },

  async getUsers() {
    return runServiceQuery(
      async () => {
        const { data, error } = await supabase.rpc('portal_user_directory');

        if (error) {
          throw error;
        }

        return (data ?? []).map((user) => ({
          id: user.id,
          displayName: user.display_name || user.email || 'Unnamed user',
          email: user.email || '',
          isActive: Boolean(user.is_active),
          lastSignIn: user.last_sign_in_at,
          role: user.role_key || 'resident',
          roleName: user.role_name || formatStatusLabel(user.role_key || 'resident'),
          barangayId: user.barangay_id || null,
          barangayCode: user.barangay_code || null,
          barangayName: user.barangay_name || null,
        }));
      },
      demoData.demoUsers,
      'Failed to load portal users.'
    );
  },

  async createUser(userData) {
    if (USE_DEMO) {
      return {
        id: `usr-${Date.now()}`,
        displayName: userData.displayName.trim(),
        email: userData.email.trim().toLowerCase(),
        role: userData.role,
        roleName: formatStatusLabel(userData.role),
        isActive: userData.isActive,
        lastSignIn: null,
        barangayId: userData.barangayId || null,
        barangayCode: userData.barangayCode || null,
        barangayName: userData.barangayName || null,
      };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const payload = {
      displayName: userData.displayName?.trim() || '',
      email: userData.email?.trim().toLowerCase() || '',
      password: String(userData.password ?? ''),
      role: userData.role || 'resident',
      isActive: Boolean(userData.isActive),
      barangayId: userData.barangayId || null,
    };

    if (!payload.displayName) {
      throw new Error('Display name is required.');
    }

    if (!payload.email) {
      throw new Error('Email address is required.');
    }

    if (!payload.password || payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    if (roleRequiresBarangayAssignment(payload.role) && !payload.barangayId) {
      throw new Error('Barangay assignment is required for barangay staff roles.');
    }

    const { data, error } = await supabase.functions.invoke('admin-create-portal-user', {
      body: payload,
    });

    if (error) {
      const invokeMessage = await getFunctionInvokeErrorMessage(
        error,
        'Failed to create user. Ensure the admin-create-portal-user Edge Function is deployed.'
      );

      if (shouldTrySignupFallback(error, invokeMessage)) {
        try {
          return await createUserViaSignupFallback(payload);
        } catch (fallbackError) {
          const fallbackMessage = fallbackError?.message || 'Fallback signup flow failed.';
          throw new Error(`${invokeMessage} ${fallbackMessage}`);
        }
      }

      throw new Error(invokeMessage);
    }

    const createdUser = data?.user ?? data;

    if (!createdUser?.id) {
      throw new Error('User was not created. Edge Function response was incomplete.');
    }

    return {
      id: createdUser.id,
      displayName: createdUser.displayName || payload.displayName,
      email: createdUser.email || payload.email,
      role: createdUser.role || payload.role,
      roleName: createdUser.roleName || formatStatusLabel(createdUser.role || payload.role),
      isActive: typeof createdUser.isActive === 'boolean' ? createdUser.isActive : payload.isActive,
      lastSignIn: createdUser.lastSignIn ?? null,
      barangayId: createdUser.barangayId ?? payload.barangayId ?? null,
      barangayCode: createdUser.barangayCode ?? null,
      barangayName: createdUser.barangayName ?? null,
    };
  },

  async updateUser(userId, userData) {
    if (USE_DEMO) {
      return { success: true };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    if (roleRequiresBarangayAssignment(userData.role) && !userData.barangayId) {
      throw new Error('Barangay assignment is required for barangay staff roles.');
    }

    const { error } = await supabase.rpc('update_portal_user', {
      target_user_id: userId,
      target_display_name: userData.displayName.trim(),
      target_role_key: userData.role,
      target_is_active: userData.isActive,
      target_barangay_id: userData.barangayId || null,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  },

  async deleteUser(userId) {
    if (USE_DEMO) {
      return { success: true };
    }

    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
    }

    const { error } = await supabase.rpc('deactivate_portal_user', {
      target_user_id: userId,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  },

  async searchResidents(query) {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        if (scope.isScopedRole) {
          assertBarangayScopeForRead();
        }

        const cleanQuery = query.trim();
        if (!cleanQuery) return [];

        let residentsQuery = supabase
          .from('residents')
          .select(`
            id,
            first_name,
            middle_name,
            last_name,
            suffix_name,
            household:households!household_id(
              id,
              household_code,
              household_name,
              purok_sitio,
              address_line1,
              monthly_income,
              barangay:barangays(name)
            )
          `)
          .is('archived_at', null);

        if (scope.isScopedRole) {
          residentsQuery = residentsQuery.eq('barangay_id', scope.barangayId);
        }

        // Split query into terms to handle "First Last" or "First Middle Last"
        const terms = cleanQuery.split(/\s+/);
        
        if (terms.length > 1) {
          // For multi-word queries, we search for the whole string as a partial match in name fields
          // PostgREST "or" syntax with "*" as wildcard for ilike
          const filter = `first_name.ilike.*${cleanQuery}*,last_name.ilike.*${cleanQuery}*,middle_name.ilike.*${cleanQuery}*`;
          residentsQuery = residentsQuery.or(filter);
        } else {
          // Single word search
          const filter = `first_name.ilike.*${cleanQuery}*,last_name.ilike.*${cleanQuery}*,middle_name.ilike.*${cleanQuery}*`;
          residentsQuery = residentsQuery.or(filter);
        }

        const { data, error } = await residentsQuery.limit(10);

        if (error) {
          console.error('Supabase search error:', error);
          throw error;
        }

        return (data ?? []).map((resident) => {
          const fullName = formatPersonName(resident);
          const household = resident.household;
          const addressParts = [
            household?.purok_sitio,
            household?.address_line1,
            household?.barangay?.name
          ].filter(Boolean);
          
          const address = addressParts.length > 0 ? addressParts.join(', ') : 'No address on file';

          return {
            id: resident.id,
            name: fullName,
            householdCode: household?.household_code || '',
            barangay: household?.barangay?.name || '',
            address: address,
            monthlyIncome: household?.monthly_income ?? '',
          };
        });
      },
      () => {
        const scope = getScopedBarangayScope();
        const normalizedQuery = query.toLowerCase();
        const results = demoData.householdRows.filter((h) => (
          (h.head.toLowerCase().includes(normalizedQuery) || h.code.toLowerCase().includes(normalizedQuery))
          && (!scope.isScopedRole || normalizeText(h.barangay) === normalizeText(scope.barangayName))
        ));
        return results.map(r => ({
          name: r.head,
          householdCode: r.code,
          barangay: r.barangay,
          address: `Purok 3, ${r.barangay}, Barbaza`,
          monthlyIncome: r.headMonthlyIncome ?? r.monthlyIncome ?? '',
        }));
      },
      'Failed to search residents.'
    );
  },

  async searchHouseholds(query) {
    return runServiceQuery(
      async () => {
        const scope = getScopedBarangayScope();
        if (scope.isScopedRole) {
          assertBarangayScopeForRead();
        }

        let householdsQuery = supabase
          .from('households')
          .select(`
            id,
            household_code,
            household_name,
            barangay_id,
            purok_sitio,
            address_line1,
            monthly_income,
            barangay:barangays(name)
          `)
          .ilike('household_code', `%${query}%`)
          .is('archived_at', null)
          .limit(8);

        if (scope.isScopedRole) {
          householdsQuery = householdsQuery.eq('barangay_id', scope.barangayId);
        }

        const { data, error } = await householdsQuery;

        if (error) {
          throw error;
        }

        return (data ?? []).map((household) => {
          const address = [
            household.purok_sitio,
            household.address_line1,
            household.barangay?.name
          ].filter(Boolean).join(', ');

          return {
            id: household.id,
            name: household.household_name || 'Registered household',
            householdCode: household.household_code,
            barangay: household.barangay?.name || '',
            address: address || 'No address on file',
            monthlyIncome: household.monthly_income ?? '',
          };
        });
      },
      () => {
        const scope = getScopedBarangayScope();
        const normalizedQuery = query.toLowerCase();
        const results = demoData.householdRows.filter((h) => (
          h.code.toLowerCase().includes(normalizedQuery)
          && (!scope.isScopedRole || normalizeText(h.barangay) === normalizeText(scope.barangayName))
        ));
        return results.map(r => ({
          name: r.head,
          householdCode: r.code,
          barangay: r.barangay,
          address: `Purok 3, ${r.barangay}, Barbaza`,
          monthlyIncome: r.headMonthlyIncome ?? r.monthlyIncome ?? '',
        }));
      },
      'Failed to search households.'
    );
  },
};
