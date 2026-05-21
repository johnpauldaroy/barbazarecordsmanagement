import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { classifyIncome } from '../incomeClassification';
import {
  canApproveApplications as canApproveApplicationsByRole,
  canCreateApplications as canCreateApplicationsByRole,
  canViewUploadedDocuments as canViewUploadedDocumentsByRole,
  resolveSessionRoleKey,
} from '../roleAccess';
import { getHashQueryParams } from '../routes';
import { supabaseService } from '../supabaseService';

function QueueActions({ item, onViewDetails }) {
  return (
    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        size="sm"
        title={`View details for ${item.reference}`}
        onClick={onViewDetails}
      >
        View details
      </Button>
    </div>
  );
}

function formatPesoAmount(value) {
  const amount = Number(value ?? 0);
  return `PHP ${Number.isFinite(amount) ? amount.toLocaleString('en-PH') : '0'}`;
}

const PROGRAM_ABBREV = {
  'assistance to individuals in crisis situation': 'AICS',
  'tulong panghanapbuhay sa ating disadvantaged/displaced workers': 'TUPAD',
  '4ps monitoring': '4Ps',
  '4ps': '4Ps',
};
function abbreviateProgram(name) {
  return PROGRAM_ABBREV[name.toLowerCase()] ?? name;
}

function RecommendationActions({ item, canCreateApplications, onSelect }) {
  const suggestedProgramName = item.suggestedProgram?.name ?? '';
  const isAlreadyEnrolledInSuggested = suggestedProgramName
    && (item.activePrograms ?? []).some(
      (p) => p.toLowerCase() === suggestedProgramName.toLowerCase()
    );
  const isDisabled = !canCreateApplications || item.isQuotaFull || isAlreadyEnrolledInSuggested;
  const label = item.isQuotaFull
    ? 'Quota full'
    : isAlreadyEnrolledInSuggested
    ? 'Already enrolled'
    : 'Select';

  return (
    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        size="sm"
        variant={isAlreadyEnrolledInSuggested ? 'outline' : 'default'}
        title={isDisabled ? label : `Select ${item.householdCode}`}
        disabled={isDisabled}
        onClick={() => onSelect(item)}
      >
        {label}
      </Button>
    </div>
  );
}

function SuggestionsDropdown({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="autocomplete-dropdown">
      {suggestions.map((item, index) => (
        <button
          key={item.id || index}
          type="button"
          className="autocomplete-item"
          onClick={() => onSelect(item)}
        >
          <div className="autocomplete-item__main">
            <strong>{item.householdCode}</strong>
            <small>{item.name}</small>
          </div>
          <div className="autocomplete-item__meta">
            <span>{item.barangay}</span>
            <small>{item.address}</small>
          </div>
        </button>
      ))}
    </div>
  );
}

function normalizeWorkflowStatus(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
  const statusAliases = {
    'duplicate flagged': 'under_review',
    'supervisor review': 'verified',
    'need supervisor review': 'verified',
    'need applicant revision': 'needs_more_info',
    'under verification': 'under_review',
    'ready for release': 'approved',
  };

  return statusAliases[normalized] || normalized.replace(/\s+/g, '_');
}

function getApplicationTabKey(row) {
  const status = normalizeWorkflowStatus(row?.meta?.currentStatus || row?.status);

  if (['approved', 'released', 'ready_for_release'].includes(status)) {
    return 'approved';
  }

  if (status === 'rejected') {
    return 'rejected';
  }

  return 'submitted';
}

function formatWorkflowStatusLabel(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getWorkflowActions(record, canApproveApplications) {
  const status = normalizeWorkflowStatus(record?.meta?.currentStatus || record?.status || record?.checks?.[0]?.description);

  if (!canApproveApplications) {
    return [];
  }

  if (['submitted', 'under_review', 'verified', 'needs_more_info'].includes(status)) {
    return [
      { status: 'approved', label: 'Approve', icon: CheckCircle2, variant: 'default' },
      { status: 'rejected', label: 'Reject', icon: XCircle, variant: 'destructive' },
    ];
  }

  return [];
}

function generateSuggestedRemark(record, nextStatus) {
  const applicant = record.applicant || 'the applicant';
  const program = record.program || 'the program';
  const household = record.household || '';
  const intakeNote = record.checks?.find((c) => c.title === 'Processor note')?.description || '';
  const hasIntakeNote = intakeNote && intakeNote !== 'No internal note was recorded during intake.';
  const missingDocsCheck = record.checks?.find((c) => c.title === 'Requirements');
  const allDocsComplete = missingDocsCheck?.state === 'complete';

  if (nextStatus === 'approved') {
    const parts = [
      `Application of ${applicant}${household ? ` (${household})` : ''} reviewed and approved for ${program}.`,
    ];
    if (allDocsComplete) {
      parts.push('All required documents have been verified and are in order.');
    }
    if (hasIntakeNote) {
      parts.push(`Intake note: ${intakeNote}`);
    }
    parts.push('Approved subject to availability of funds and compliance with program guidelines.');
    return parts.join(' ');
  }

  if (nextStatus === 'rejected') {
    return `Application of ${applicant}${household ? ` (${household})` : ''} for ${program} does not meet the eligibility criteria at this time. `;
  }

  if (nextStatus === 'needs_more_info') {
    return `Additional documents or information are required to process the application of ${applicant} for ${program}. Please submit the missing requirements at the MSWD office.`;
  }

  if (nextStatus === 'under_review') {
    return `Application of ${applicant} for ${program} is now under review by MSWD staff.`;
  }

  if (nextStatus === 'released') {
    return `Assistance for ${applicant}${household ? ` (${household})` : ''} under ${program} has been released. Please acknowledge receipt.`;
  }

  return '';
}

function AddApplicationModal({
  formState,
  selectedProgram,
  programs,
  barangays,
  isBarangayLocked,
  scopedBarangayName,
  onChange,
  onUploadRequirement,
  onRemoveRequirementFile,
  errorMessage,
  isSaving,
  duplicateCheck,
  duplicateLoading,
  onClose,
  onSubmit,
  suggestions,
  activeField,
  onSelectSuggestion,
}) {
  const requirementList = selectedProgram?.requirements ?? [];
  const incomeTier = formState.householdMonthlyIncome !== ''
    && formState.householdMonthlyIncome != null
    ? classifyIncome(formState.householdMonthlyIncome)
    : null;

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="records-modal__panel max-w-6xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Applications</span>
            <DialogTitle>Add application</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Fill out new application details and submit required documents.
          </DialogDescription>
        </DialogHeader>

        <form className="application-form-grid gap-4" onSubmit={onSubmit}>
          <label className="settings-field autocomplete-container">
            <span>Household code</span>
            <Input
              name="household"
              value={formState.household}
              onChange={onChange}
              placeholder="HH-BAR-0001"
              required
              autoComplete="off"
            />
            {activeField === 'household' && (
              <SuggestionsDropdown
                suggestions={suggestions}
                onSelect={onSelectSuggestion}
              />
            )}
          </label>

          <label className="settings-field autocomplete-container">
            <span>Applicant name</span>
            <Input
              name="applicant"
              value={formState.applicant}
              onChange={onChange}
              placeholder="Enter full name"
              required
              autoComplete="off"
            />
            {activeField === 'applicant' && (
              <SuggestionsDropdown
                suggestions={suggestions}
                onSelect={onSelectSuggestion}
              />
            )}
          </label>

          <label className="settings-field">
            <span>Program</span>
            <select name="programCode" value={formState.programCode} onChange={onChange} required>
              {!selectedProgram ? <option value="">Select program</option> : null}
              {programs.map((program) => (
                <option key={program.code} value={program.code}>
                  {program.name}
                </option>
              ))}
            </select>
            {formState.suggestedProgramCode && formState.programCode !== formState.suggestedProgramCode ? (
              <small style={{ color: '#d97706' }}>
                System suggested: {formState.suggestedProgramName} — you can change this.
              </small>
            ) : formState.suggestedProgramCode ? (
              <small style={{ color: '#16a34a' }}>
                Suggested based on household eligibility and quota availability.
              </small>
            ) : null}
            {duplicateLoading && (
              <small style={{ color: '#6b7280' }}>Checking for duplicate applications…</small>
            )}
            {!duplicateLoading && duplicateCheck?.isDuplicate && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '8px 12px',
                marginTop: '6px',
              }}>
                <strong style={{ color: '#dc2626', fontSize: '13px' }}>Duplicate application detected</strong>
                <p style={{ color: '#7f1d1d', fontSize: '12px', margin: '4px 0 0' }}>
                  {duplicateCheck.reason}
                </p>
                {duplicateCheck.conflictingRef && (
                  <p style={{ color: '#7f1d1d', fontSize: '12px', margin: '2px 0 0' }}>
                    Existing ref: <strong>{duplicateCheck.conflictingRef}</strong>
                    {duplicateCheck.conflictingStatus ? ` (${duplicateCheck.conflictingStatus})` : ''}
                  </p>
                )}
              </div>
            )}
          </label>

          <label className="settings-field">
            <span>Barangay</span>
            <select
              name="barangay"
              value={formState.barangay}
              onChange={onChange}
              required
              disabled={isBarangayLocked}
            >
              <option value="" disabled>Select barangay</option>
              {barangays.map((barangay) => (
                <option key={barangay.code} value={barangay.name}>
                  {barangay.name}
                </option>
              ))}
            </select>
            {isBarangayLocked ? <small>Locked to {scopedBarangayName || 'your assigned barangay'}.</small> : null}
          </label>

          <label className="settings-field application-form-grid__wide">
            <span>Residence address</span>
            <Input
              name="address"
              value={formState.address}
              onChange={onChange}
              placeholder="Auto-filled from household records"
              readOnly
            />
          </label>

          <label className="settings-field">
            <span>Income classification</span>
            <Input
              value={incomeTier ? incomeTier.label : 'Select household first'}
              readOnly
            />
            {incomeTier ? (
              <small className="application-income-meta">
                Range: {incomeTier.range}
              </small>
            ) : (
              <small className="application-income-meta">
                Household monthly income is needed to classify.
              </small>
            )}
          </label>

          <label className="settings-field application-form-grid__wide">
            <span>Intake note</span>
            <Textarea
              name="note"
              value={formState.note}
              onChange={onChange}
              rows={3}
              placeholder="Short summary of the application request"
            />
          </label>

          <section className="application-requirements application-form-grid__wide">
            <div className="section-heading">
              <h2>Document checklist</h2>
            </div>

            <div className="application-requirements__list">
              {requirementList.map((requirement) => (
                <div key={requirement.id || requirement.label} className="application-requirements__item">
                  <div className="application-requirements__body">
                    <strong>{requirement.label}</strong>
                    <span>
                      {formState.uploadedRequirements[requirement.id]?.name ?? 'No file uploaded yet'}
                    </span>
                  </div>
                  <div className="application-requirements__actions">
                    <label className="row-action row-action--ghost application-upload-button">
                      <span>{formState.uploadedRequirements[requirement.id] ? 'Replace file' : 'Upload file'}</span>
                      <input
                        type="file"
                        className="sr-only"
                        aria-label={`Upload file for ${requirement.label}`}
                        accept={requirement.allowed_file_types?.join(',') || undefined}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            onUploadRequirement(requirement, file);
                          }
                          event.target.value = '';
                        }}
                      />
                    </label>
                    {formState.uploadedRequirements[requirement.id] ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemoveRequirementFile(requirement.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {errorMessage ? <div className="auth-alert application-form-grid__wide">{errorMessage}</div> : null}

          <div className="application-form-actions application-form-grid__wide">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !!duplicateCheck?.isDuplicate || duplicateLoading}>
              {isSaving ? 'Saving...' : 'Add application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDetailsModal({
  record,
  canApproveApplications,
  canViewUploadedDocuments,
  onClose,
  onTransition,
  transitioningStatus,
  transitionError,
}) {
  const [remarks, setRemarks] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [localError, setLocalError] = useState('');
  const [quotaWarning, setQuotaWarning] = useState(null);
  const workflowActions = getWorkflowActions(record, canApproveApplications);
  const willApproveOrRelease = workflowActions.some((a) => ['approved', 'released'].includes(a.status));
  const NO_AMOUNT_PROGRAM_CODES = ['TUPAD', '4PS', '4P', 'FOURPS'];
  const programCodes = (record.meta?.programCodes ?? []).map((c) => c.toUpperCase());
  const isNoAmountProgram = programCodes.some((c) => NO_AMOUNT_PROGRAM_CODES.includes(c))
    || (record.program ?? '').toLowerCase().includes('tupad')
    || (record.program ?? '').toLowerCase().includes('4p');
  const showAmountInput = willApproveOrRelease;

  useEffect(() => {
    if (!willApproveOrRelease) return;
    const barangayId = record.meta?.barangayId;
    const programIds = record.meta?.programIds ?? [];
    if (!barangayId || programIds.length === 0) return;

    let cancelled = false;
    async function checkQuota() {
      try {
        const year = new Date().getFullYear();
        const checks = await Promise.all(
          programIds.map((pid) =>
            supabaseService.checkBarangayQuota({ barangayId, programId: pid, year })
          )
        );
        if (cancelled) return;
        const worstQuota = checks
          .filter(Boolean)
          .reduce((worst, q) => {
            if (!worst) return q;
            return Number(q.remaining_count) < Number(worst.remaining_count) ? q : worst;
          }, null);
        if (worstQuota) {
          setQuotaWarning({
            used: Number(worstQuota.used_count),
            max: worstQuota.max_beneficiaries,
            remaining: Number(worstQuota.remaining_count),
            isFull: Number(worstQuota.remaining_count) <= 0,
          });
        }
      } catch {
        // quota check failure is non-blocking; server-side RPC enforces the hard limit
      }
    }
    void checkQuota();
    return () => { cancelled = true; };
  }, [willApproveOrRelease, record.meta?.barangayId, record.meta?.programIds]);

  const submitTransition = (nextStatus) => {
    const trimmedRemarks = remarks.trim();
    if (['needs_more_info', 'rejected'].includes(nextStatus) && !trimmedRemarks) {
      setLocalError('Remarks are required when requesting more information or rejecting an application.');
      return;
    }
    if (!isNoAmountProgram && ['approved', 'released'].includes(nextStatus) && (!approvedAmount || Number(approvedAmount) <= 0)) {
      setLocalError('Please enter the approved amount (PHP) before proceeding.');
      return;
    }

    setLocalError('');
    onTransition(nextStatus, trimmedRemarks, isNoAmountProgram ? null : (Number(approvedAmount) || null));
  };

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="records-modal__panel max-w-6xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Application history</span>
            <DialogTitle>{record.reference}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Review application details, checks, and document status.</DialogDescription>
        </DialogHeader>

        <div className="records-modal__summary">
          <div className="records-modal__card"><span>Applicant</span><strong>{record.applicant}</strong></div>
          <div className="records-modal__card"><span>Program</span><strong>{record.program}</strong></div>
          <div className="records-modal__card"><span>Household</span><strong>{record.household}</strong></div>
          <div className="records-modal__card"><span>Submitted</span><strong>{record.submittedAt}</strong></div>
        </div>

        <div className="records-modal__grid">
          <section className="panel panel--highlight">
            <SectionHeading eyebrow="Timeline" title="Record history" />
            <div className="records-history">
              {record.history.map((entry) => (
                <article key={`${entry.timestamp}-${entry.action}`} className="records-history__item">
                  <div className="records-history__time">{entry.timestamp}</div>
                  <div className="records-history__body">
                    <strong>{entry.action}</strong>
                    <span>{entry.actor}</span>
                    <p>{entry.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel panel--highlight">
            <SectionHeading eyebrow="Checks" title="Review status" />
            <div className="check-stack">
              {record.checks.map((item) => (
                <div key={item.title} className={`check-card check-card--${item.state} check-card--light`}>
                  <div className="check-card__marker" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {workflowActions.length ? (
          <section className="panel panel--highlight application-workflow">
            <div className="application-workflow__header">
              <SectionHeading eyebrow="Approval workflow" title="Next action" />
              <StatusPill
                status={formatWorkflowStatusLabel(record.meta?.currentStatus || record.status || 'Submitted')}
                tone={record.meta?.currentStatus === 'approved' ? 'good' : 'warning'}
              />
            </div>
            {showAmountInput && (
              <label className="settings-field">
                <span>Approved amount (PHP)</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={approvedAmount}
                  onChange={(event) => setApprovedAmount(event.target.value)}
                  placeholder={isNoAmountProgram ? 'Not required for this program' : '0.00'}
                  disabled={isNoAmountProgram}
                />
                {isNoAmountProgram ? (
                  <small>Approved amount is disabled for TUPAD and 4Ps applications.</small>
                ) : null}
              </label>
            )}
            <label className="settings-field">
              <span>Decision remarks</span>
              <Textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                placeholder="Add review notes, missing requirements, approval basis, or rejection reason"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {workflowActions.map((action) => {
                  const suggested = generateSuggestedRemark(record, action.status);
                  if (!suggested) return null;
                  return (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => setRemarks(suggested)}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        background: '#f9fafb',
                        color: '#374151',
                        cursor: 'pointer',
                        lineHeight: '1.6',
                      }}
                    >
                      Use {action.label.toLowerCase()} note
                    </button>
                  );
                })}
              </div>
            </label>
            {quotaWarning ? (
              <div className={`auth-alert${quotaWarning.isFull ? '' : ' auth-alert--warning'}`}>
                {quotaWarning.isFull
                  ? `Quota full: ${quotaWarning.used} of ${quotaWarning.max} slots used for this barangay/program. Approval will be blocked.`
                  : `Low quota: only ${quotaWarning.remaining} of ${quotaWarning.max} slots remaining for this barangay/program.`}
              </div>
            ) : null}
            {localError || transitionError ? (
              <div className="auth-alert">{localError || transitionError}</div>
            ) : null}
            <div className="application-workflow__actions">
              {workflowActions.map((action) => {
                const Icon = action.icon;
                const isBusy = transitioningStatus === action.status;
                return (
                  <Button
                    key={action.status}
                    type="button"
                    variant={action.variant}
                    onClick={() => submitTransition(action.status)}
                    disabled={Boolean(transitioningStatus)}
                  >
                    <Icon aria-hidden="true" />
                    {isBusy ? 'Saving...' : action.label}
                  </Button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="panel panel--highlight">
          <SectionHeading eyebrow="Documents" title="Requirement status" />
          <div className="list-stack">
            {record.documents.map((item) => (
              <div key={`${item.name}-${item.fileName || item.status}`} className="list-row">
                <div>
                  <strong>{item.name}</strong>
                  {item.fileName ? <p>{item.fileName}</p> : null}
                </div>
                <div className="list-row__end">
                  {canViewUploadedDocuments && item.viewUrl ? (
                    <a
                      className="row-action row-action--ghost row-action--sm"
                      href={item.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View file
                    </a>
                  ) : null}
                  <StatusPill status={item.status} tone={item.tone} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function parseAgeHours(value) {
  const match = String(value).match(/^(\d+)([hd])$/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, amount, unit] = match;
  return unit.toLowerCase() === 'd' ? Number(amount) * 24 : Number(amount);
}

function getQueueIntentConfig(hash) {
  const filterValue = getHashQueryParams(hash).get('filter');

  if (filterValue === 'pending_review') {
    return {
      key: filterValue,
      label: 'Pending review',
      searchValue: '',
      rowFilter: (row) => [
        'duplicate flagged',
        'need applicant revision',
        'needs more info',
        'submitted',
        'under review',
        'under verification',
        'verified',
      ].includes(String(row.status).toLowerCase()),
    };
  }

  if (filterValue === 'ready_for_approval') {
    return {
      key: filterValue,
      label: 'Ready for approval',
      searchValue: '',
      rowFilter: (row) =>
        ['supervisor review', 'ready for release', 'approved'].includes(
          String(row.status).toLowerCase()
        ),
    };
  }

  if (filterValue === 'sla_breach') {
    return {
      key: filterValue,
      label: 'SLA breach risk (48h+)',
      searchValue: '',
      rowFilter: (row) => parseAgeHours(row.age) >= 48,
    };
  }

  return {
    key: null,
    label: '',
    searchValue: '',
    rowFilter: null,
  };
}

function ApplicationsPage({ session }) {
  const [queueRows, setQueueRows] = useState([]);
  const [caseDetails, setCaseDetails] = useState({});
  const [detailReference, setDetailReference] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [applicationTab, setApplicationTab] = useState('recommendations');
  const [recommendationProgramCode, setRecommendationProgramCode] = useState('');
  const [recommendationRows, setRecommendationRows] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [recommendationRefreshKey, setRecommendationRefreshKey] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageError, setPageError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [transitionError, setTransitionError] = useState('');
  const [transitioningStatus, setTransitioningStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newApplication, setNewApplication] = useState({
    applicant: '',
    household: '',
    householdId: '',
    householdMonthlyIncome: '',
    programCode: '',
    barangay: '',
    address: '',
    note: '',
    uploadedRequirements: {},
  });
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const [queueIntent] = useState(() => getQueueIntentConfig(window.location.hash));
  const canCreateApplications = canCreateApplicationsByRole(session);
  const canApproveApplications = canApproveApplicationsByRole(session);
  const canViewUploadedDocuments = canViewUploadedDocumentsByRole(session);
  const roleKey = resolveSessionRoleKey(session);
  const isBarangayScopedRole = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  const scopedBarangayName = session?.barangayName || '';

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setLoadingQueue(true);
      setPageError('');

      try {
        const [rows, programRows, barangayRows, quotaRows] = await Promise.all([
          supabaseService.getApplicationQueue(),
          supabaseService.getPrograms(),
          supabaseService.getBarangays(),
          supabaseService.getBarangayProgramQuotas(new Date().getFullYear()).catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        // Build quota lookup keyed by barangay_id — take the worst remaining_count across programs
        const quotaByBarangay = new Map();
        for (const q of quotaRows) {
          const existing = quotaByBarangay.get(q.barangay_id);
          const remaining = Number(q.remaining_count);
          const max = q.max_beneficiaries;
          if (!existing || remaining < existing.remaining) {
            quotaByBarangay.set(q.barangay_id, { remaining, max, used: Number(q.used_count) });
          }
        }

        const enrichedRows = rows.map((row) => {
          const qKey = row.barangayId;
          const qs = qKey ? quotaByBarangay.get(qKey) : null;
          return qs ? { ...row, quotaStatus: qs } : row;
        });

        setQueueRows(enrichedRows);
        setPrograms(programRows);
        setBarangays(barangayRows);
        setRecommendationProgramCode((current) => current || programRows[0]?.code || '');
        setNewApplication((current) => ({
          ...current,
          programCode: current.programCode || programRows[0]?.code || '',
          barangay: isBarangayScopedRole
            ? (scopedBarangayName || barangayRows[0]?.name || '')
            : (current.barangay || barangayRows[0]?.name || ''),
        }));
      } catch (error) {
        if (isMounted) {
          setPageError(error.message || 'Failed to load applications.');
        }
      } finally {
        if (isMounted) {
          setLoadingQueue(false);
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [isBarangayScopedRole, scopedBarangayName]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendations() {
      if (applicationTab !== 'recommendations' || !recommendationProgramCode) {
        return;
      }

      setLoadingRecommendations(true);
      setRecommendationError('');

      try {
        const year = new Date().getFullYear();
        const [rows, quotaRows] = await Promise.all([
          supabaseService.getRecommendationCandidates({
            programCode: recommendationProgramCode,
            year,
          }),
          supabaseService.getBarangayProgramQuotas(year).catch(() => []),
        ]);

        // Build quota lookup keyed by "barangayId:programCode"
        const quotaMap = new Map(
          quotaRows.map((q) => [`${q.barangay_id}:${q.program_code}`, q])
        );

        const enrichedRows = rows.map((row) => ({
          ...row,
          suggestedProgram: supabaseService.resolveSuggestedProgram(row, programs, quotaMap),
        }));

        if (isMounted) {
          setRecommendationRows(enrichedRows);
        }
      } catch (error) {
        if (isMounted) {
          setRecommendationRows([]);
          setRecommendationError(error.message || 'Failed to load recommendations.');
        }
      } finally {
        if (isMounted) {
          setLoadingRecommendations(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [applicationTab, recommendationProgramCode, recommendationRefreshKey, programs]);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.code === newApplication.programCode) ?? programs[0] ?? null,
    [newApplication.programCode, programs]
  );
  const selectedRecommendationProgram = useMemo(
    () => programs.find((program) => program.code === recommendationProgramCode) ?? programs[0] ?? null,
    [programs, recommendationProgramCode]
  );
  const selectedCase = detailReference ? caseDetails[detailReference] : null;
  const tabCounts = useMemo(() => queueRows.reduce((counts, row) => {
    const tabKey = getApplicationTabKey(row);
    counts[tabKey] = (counts[tabKey] ?? 0) + 1;
    return counts;
  }, { submitted: 0, approved: 0, rejected: 0 }), [queueRows]);
  const visibleQueueRows = useMemo(
    () => queueRows.filter((row) => getApplicationTabKey(row) === applicationTab),
    [applicationTab, queueRows]
  );

  const stats = useMemo(() => {
    const verificationCount = queueRows.filter((item) =>
      ['Duplicate Flagged', 'Need Applicant Revision', 'Under Verification', 'Needs More Info'].includes(item.status)
    ).length;
    const approvalCount = queueRows.filter((item) =>
      ['Supervisor Review', 'Ready For Release', 'Approved'].includes(item.status)
    ).length;
    const programsInQueue = [...new Set(queueRows.map((item) => item.program))].join(', ');

    return [
      {
        label: 'Assigned today',
        value: String(queueRows.length),
        trend: programsInQueue ? `Across ${programsInQueue}` : 'No active assignments',
        tone: 'accent',
      },
      {
        label: 'For verification',
        value: String(verificationCount),
        trend: 'Includes duplicate and document checks',
        tone: 'default',
      },
      {
        label: 'For approval',
        value: String(approvalCount),
        trend: `${queueRows.filter((item) => parseAgeHours(item.age) >= 48).length} cases older than SLA`,
        tone: 'warning',
      },
    ];
  }, [queueRows]);

  const resetApplicationForm = () => {
    setNewApplication((current) => ({
      ...current,
      applicant: '',
      household: '',
      householdId: '',
      householdMonthlyIncome: '',
      programCode: programs[0]?.code || '',
      barangay: isBarangayScopedRole ? (scopedBarangayName || barangays[0]?.name || '') : (barangays[0]?.name || ''),
      address: '',
      note: '',
      uploadedRequirements: {},
    }));
    setSuggestions([]);
    setActiveSuggestionField(null);
    setDuplicateCheck(null);
  };

  useEffect(() => {
    const householdId = newApplication.householdId;
    const programCode = newApplication.programCode;

    if (!showAddModal || !householdId || !programCode) {
      setDuplicateCheck(null);
      return;
    }

    const program = programs.find((p) => p.code === programCode);
    if (!program?.id) {
      setDuplicateCheck(null);
      return;
    }

    let cancelled = false;
    setDuplicateLoading(true);
    setDuplicateCheck(null);

    supabaseService
      .checkApplicationDuplicate({ householdId, programId: program.id })
      .then((result) => { if (!cancelled) setDuplicateCheck(result); })
      .catch(() => { if (!cancelled) setDuplicateCheck(null); })
      .finally(() => { if (!cancelled) setDuplicateLoading(false); });

    return () => { cancelled = true; };
  }, [newApplication.householdId, newApplication.programCode, programs, showAddModal]);

  const openDetails = async (reference) => {
    setDetailReference(reference);
    setPageError('');
    setTransitionError('');

    if (caseDetails[reference]) {
      return;
    }

    setLoadingDetails(true);

    try {
      const detail = await supabaseService.getApplicationDetails(reference);
      setCaseDetails((current) => ({
        ...current,
        [reference]: detail,
      }));
    } catch (error) {
      setDetailReference(null);
      setPageError(error.message || 'Failed to load application details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApplicationTransition = async (nextStatus, remarks, approvedAmount) => {
    if (!selectedCase) {
      return;
    }

    setTransitioningStatus(nextStatus);
    setTransitionError('');

    try {
      const result = await supabaseService.transitionApplication({
        reference: selectedCase.reference,
        applicationId: selectedCase.meta?.applicationId,
        status: nextStatus,
        remarks,
        approvedAmount,
        currentRecord: selectedCase,
      });

      setCaseDetails((current) => ({
        ...current,
        [selectedCase.reference]: result.detail,
      }));
      setQueueRows((current) =>
        current.map((item) =>
          item.reference === selectedCase.reference
            ? {
                ...item,
                status: result.status,
                tone: result.tone,
                age: result.age || item.age,
              }
            : item
        )
      );
    } catch (error) {
      setTransitionError(error.message || 'Failed to update the application workflow.');
    } finally {
      setTransitioningStatus('');
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setSaveError('');
    if (name === 'barangay' && isBarangayScopedRole) {
      return;
    }

    setNewApplication((current) => ({
      ...current,
      [name]: value,
      ...(name === 'applicant' || name === 'household' ? { householdMonthlyIncome: '' } : {}),
      uploadedRequirements: name === 'programCode' ? {} : current.uploadedRequirements,
    }));

    if (name === 'applicant' || name === 'household') {
      if (value.length >= 2) {
        setActiveSuggestionField(name);
        void fetchSuggestions(name, value);
      } else {
        setSuggestions([]);
        setActiveSuggestionField(null);
      }
    }
  };

  const fetchSuggestions = async (field, query) => {
    try {
      let results = [];
      if (field === 'applicant') {
        results = await supabaseService.searchResidents(query);
      } else if (field === 'household') {
        results = await supabaseService.searchHouseholds(query);
      }
      setSuggestions(results);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setNewApplication((current) => ({
      ...current,
      applicant: suggestion.name,
      household: suggestion.householdCode,
      barangay: isBarangayScopedRole ? (scopedBarangayName || current.barangay) : (suggestion.barangay || current.barangay),
      address: suggestion.address || '',
      householdMonthlyIncome: suggestion.monthlyIncome ?? '',
    }));
    setSuggestions([]);
    setActiveSuggestionField(null);
  };

  const handleSelectRecommendation = (candidate) => {
    if (!canCreateApplications || candidate.isQuotaFull) {
      return;
    }

    // Use the system-suggested program if available, otherwise fall back to the filter
    const suggestedProgram = candidate.suggestedProgram ?? null;
    const programCode = suggestedProgram?.code || recommendationProgramCode || candidate.programCode;

    const prefill = supabaseService.prefillApplicationFromRecommendation({
      ...candidate,
      programCode,
    });

    setSaveError('');
    setSuggestions([]);
    setActiveSuggestionField(null);
    setNewApplication((current) => ({
      ...current,
      ...prefill,
      barangay: isBarangayScopedRole
        ? (scopedBarangayName || prefill.barangay || current.barangay)
        : (prefill.barangay || current.barangay),
      programCode: prefill.programCode || current.programCode,
      suggestedProgramCode: suggestedProgram?.code ?? '',
      suggestedProgramName: suggestedProgram?.name ?? '',
      uploadedRequirements: {},
    }));
    setShowAddModal(true);
  };

  const uploadRequirement = (requirement, file) => {
    const allowedFileTypes = requirement.allowed_file_types ?? [];
    const maxFileSizeMb = Number(requirement.max_file_size_mb) || 10;

    if (allowedFileTypes.length && file.type && !allowedFileTypes.includes(file.type)) {
      setSaveError(`"${requirement.label}" only accepts: ${allowedFileTypes.join(', ')}.`);
      return;
    }

    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setSaveError(`"${requirement.label}" must be ${maxFileSizeMb} MB or smaller.`);
      return;
    }

    setSaveError('');
    setNewApplication((current) => ({
      ...current,
      uploadedRequirements: {
        ...current.uploadedRequirements,
        [requirement.id]: {
          file,
          label: requirement.label,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
        },
      },
    }));
  };

  const removeRequirementFile = (requirementId) => {
    setNewApplication((current) => {
      const nextUploadedRequirements = { ...current.uploadedRequirements };
      delete nextUploadedRequirements[requirementId];

      return {
        ...current,
        uploadedRequirements: nextUploadedRequirements,
      };
    });
  };

  const handleAddApplication = async (event) => {
    event.preventDefault();

    if (!canCreateApplications) {
      setSaveError('Your role cannot create applications.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const { queueItem, detail } = await supabaseService.createApplication({
        applicant: newApplication.applicant,
        householdCode: newApplication.household,
        barangayName: newApplication.barangay,
        programCode: newApplication.programCode,
        note: newApplication.note,
        uploadedRequirements: newApplication.uploadedRequirements,
      });

      setQueueRows((current) => [queueItem, ...current.filter((item) => item.reference !== queueItem.reference)]);
      setCaseDetails((current) => ({
        ...current,
        [queueItem.reference]: detail,
      }));
      setShowAddModal(false);
      setDetailReference(queueItem.reference);
      setRecommendationRefreshKey((current) => current + 1);
      resetApplicationForm();
    } catch (error) {
      const msg = error?.message ?? '';
      if (msg.includes('Duplicate application:')) {
        setSaveError(msg.replace('Duplicate application: ', ''));
      } else {
        setSaveError(msg || 'Failed to save the application to Supabase.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const recommendationColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (item) => <strong className="recommendation-rank">#{item.rank}</strong>,
      getSortValue: (item) => item.rank,
    },
    {
      key: 'householdCode',
      label: 'Household',
      render: (item) => (
        <strong>
          {item.householdCode}
          <small>{item.headName}</small>
          {item.activePrograms?.length > 0 && (
            <small style={{
              display: 'block',
              marginTop: '3px',
              color: '#d97706',
              fontWeight: 500,
              fontSize: '11px',
            }}>
              Active: {item.activePrograms.map(abbreviateProgram).join(', ')}
            </small>
          )}
        </strong>
      ),
      getSearchText: (item) => `${item.householdCode} ${item.headName} ${item.barangayName}`,
    },
    {
      key: 'familyCount',
      label: 'Family',
      render: (item) => <strong>{item.familyCount}</strong>,
      getSortValue: (item) => item.familyCount,
    },
    {
      key: 'incomeTier',
      label: 'Income',
      render: (item) => (
        <strong>
          {item.incomeTier}
          <small>{formatPesoAmount(item.monthlyIncome)}</small>
        </strong>
      ),
      getSortValue: (item) => item.monthlyIncome,
    },
    {
      key: 'workStatus',
      label: 'Work',
      render: (item) => <span>{item.workStatus}</span>,
    },
    {
      key: 'recommendationScore',
      label: 'Score',
      render: (item) => <span className="recommendation-score">{item.recommendationScore}</span>,
      getSortValue: (item) => item.recommendationScore,
    },
    {
      key: 'recommendationReasons',
      label: 'Reasons',
      render: (item) => (
        <div className="application-recommendation-reasons">
          {(item.recommendationReasons ?? []).slice(0, 3).map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      ),
      getSearchText: (item) => (item.recommendationReasons ?? []).join(' '),
    },
    {
      key: 'quota',
      label: 'Quota',
      render: (item) => {
        if (!item.quota) {
          return <StatusPill status="No quota set" tone="neutral" />;
        }

        return (
          <strong>
            {item.quota.used}/{item.quota.max}
            <small>{item.quota.remaining} slots left</small>
          </strong>
        );
      },
      getSortValue: (item) => (item.quota ? item.quota.remaining : Infinity),
    },
    {
      key: 'suggestedProgram',
      label: 'Suggested',
      render: (item) => {
        if (!item.suggestedProgram) {
          return <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>;
        }
        return (
          <span style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 700,
            color: '#1d4ed8',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}>
            {item.suggestedProgram.code}
          </span>
        );
      },
      getSearchText: (item) => item.suggestedProgram?.code ?? '',
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => (
        <RecommendationActions
          item={item}
          canCreateApplications={canCreateApplications}
          onSelect={handleSelectRecommendation}
        />
      ),
    },
  ];

  const columns = [
    {
      key: 'reference',
      label: 'Reference',
      render: (item) => (
        <strong>
          {item.reference}
          <small>{item.program}</small>
        </strong>
      ),
      getSearchText: (item) => `${item.reference} ${item.program}`,
    },
    { key: 'applicant', label: 'Applicant' },
    { key: 'barangay', label: 'Barangay' },
    {
      key: 'quotaStatus',
      label: 'Quota',
      render: (item) => {
        if (!item.quotaStatus) return <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>;
        const { used, max, remaining } = item.quotaStatus;
        const isFull = remaining <= 0;
        const isLow = !isFull && remaining <= Math.max(1, Math.round(max * 0.2));
        const color = isFull ? '#dc2626' : isLow ? '#d97706' : '#16a34a';
        return (
          <span
            title={`${used} of ${max} slots used`}
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color,
              background: `${color}18`,
              padding: '2px 7px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
            }}
          >
            {used}/{max}
          </span>
        );
      },
      getSortValue: (item) => (item.quotaStatus ? item.quotaStatus.remaining : Infinity),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusPill status={item.status} tone={item.tone} />,
    },
    {
      key: 'submittedAt',
      label: 'Date submitted',
      render: (item) => (
        <strong>
          {item.submittedAt || '-'}
          <small>{item.daysDelayedLabel || '0 days delayed'}</small>
        </strong>
      ),
      getSortValue: (item) => new Date(item.submittedAtRaw || 0).getTime(),
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => <QueueActions item={item} onViewDetails={() => openDetails(item.reference)} />,
    },
  ];

  const renderQueueTable = (emptyMessage) => (
    <InteractiveTable
      columns={columns}
      rows={visibleQueueRows}
      rowKey="reference"
      selectedKey={detailReference}
      onSelectRow={(row) => {
        void openDetails(row.reference);
      }}
      searchLabel="Search applications"
      searchPlaceholder="Search reference, applicant, barangay, or program"
      emptyMessage={loadingQueue ? 'Loading applications...' : emptyMessage}
      initialSortKey="submittedAt"
      initialSortDirection="desc"
      initialSearchValue={queueIntent.searchValue}
      rowFilter={queueIntent.rowFilter}
      gridTemplate="1.25fr 1.05fr 0.9fr 0.7fr 1fr 0.85fr 150px"
    />
  );

  return (
    <>
      <div className="workspace-page space-y-4">
        <section className="panel space-y-4">
          <SectionHeading eyebrow="Workload" title="Queue summary" />
          {pageError ? <div className="auth-alert">{pageError}</div> : null}
          <div className="stats-grid">
            {stats.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        <section className="panel application-panel space-y-4">
          <div className="panel-header">
          <SectionHeading eyebrow="Queue" title="Assigned applications" />
            <div className="panel-header__actions">
            </div>
          </div>

          {isBarangayScopedRole ? (
            <div className="application-queue-note">
              <strong>Barangay view</strong>
              <p>Showing records for {scopedBarangayName || 'your assigned barangay'} only.</p>
            </div>
          ) : null}
          {!canCreateApplications ? (
            <div className="application-queue-note">
              <strong>View only</strong>
              <p>Your role cannot create applications.</p>
            </div>
          ) : null}
          {queueIntent.label ? (
            <div className="application-queue-note">
              <strong>Dashboard filter applied</strong>
              <p>Showing queue items for: {queueIntent.label}.</p>
            </div>
          ) : null}

          <Tabs value={applicationTab} onValueChange={setApplicationTab} className="application-tabs">
            <TabsList className="application-tablist" aria-label="Application sections">
              <TabsTrigger className="settings-tab application-tab" value="recommendations">
                <strong>Recommendations</strong>
                <span>{recommendationRows.length}</span>
              </TabsTrigger>
              <TabsTrigger className="settings-tab application-tab" value="submitted">
                <strong>Submitted</strong>
                <span>{tabCounts.submitted}</span>
              </TabsTrigger>
              <TabsTrigger className="settings-tab application-tab" value="approved">
                <strong>Approved</strong>
                <span>{tabCounts.approved}</span>
              </TabsTrigger>
              <TabsTrigger className="settings-tab application-tab" value="rejected">
                <strong>Rejected</strong>
                <span>{tabCounts.rejected}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="application-tabpanel">
              <div className="application-recommendation-toolbar">
                <div>
                  <strong>Ranked recommendations</strong>
                  <p>
                    Based on family size, head work status, and household income
                    {selectedRecommendationProgram ? ` for ${selectedRecommendationProgram.name}` : ''}.
                  </p>
                </div>
                <label className="settings-field application-program-filter">
                  <span>Program</span>
                  <select
                    value={recommendationProgramCode}
                    onChange={(event) => setRecommendationProgramCode(event.target.value)}
                    disabled={!programs.length}
                  >
                    {programs.map((program) => (
                      <option key={program.code} value={program.code}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {recommendationError ? <div className="auth-alert">{recommendationError}</div> : null}
              <div className="application-recommendations-table">
                <InteractiveTable
                  columns={recommendationColumns}
                  rows={recommendationRows}
                  rowKey="householdCode"
                  searchLabel="Search recommendations"
                  searchPlaceholder="Search household, head, barangay, or reason"
                  emptyMessage={loadingRecommendations ? 'Loading recommendations...' : 'No recommendation candidates found.'}
                  initialSortKey="rank"
                  initialSortDirection="asc"
                  gridTemplate="0.45fr 1.25fr 0.55fr 1fr 1fr 0.55fr 1.4fr 0.75fr 0.7fr 120px"
                />
              </div>
            </TabsContent>

            <TabsContent value="submitted" className="application-tabpanel">
              {renderQueueTable('No submitted applications found.')}
            </TabsContent>
            <TabsContent value="approved" className="application-tabpanel">
              {renderQueueTable('No approved applications found.')}
            </TabsContent>
            <TabsContent value="rejected" className="application-tabpanel">
              {renderQueueTable('No rejected applications found.')}
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {loadingDetails && detailReference && !selectedCase ? (
        <Dialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setDetailReference(null);
              setLoadingDetails(false);
            }
          }}
        >
          <DialogContent className="records-modal__panel records-modal__panel--compact max-w-xl">
            <DialogHeader className="auth-form__header">
              <DialogTitle>Loading application</DialogTitle>
              <DialogDescription>Loading record.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedCase ? (
        <ApplicationDetailsModal
          record={selectedCase}
          canApproveApplications={canApproveApplications}
          canViewUploadedDocuments={canViewUploadedDocuments}
          onClose={() => {
            setDetailReference(null);
            setTransitionError('');
          }}
          onTransition={handleApplicationTransition}
          transitioningStatus={transitioningStatus}
          transitionError={transitionError}
        />
      ) : null}

      {showAddModal && canCreateApplications ? (
        <AddApplicationModal
          formState={newApplication}
          selectedProgram={selectedProgram}
          programs={programs}
          barangays={barangays}
          isBarangayLocked={isBarangayScopedRole}
          scopedBarangayName={scopedBarangayName}
          onChange={handleFormChange}
          onUploadRequirement={uploadRequirement}
          onRemoveRequirementFile={removeRequirementFile}
          errorMessage={saveError}
          isSaving={isSaving}
          duplicateCheck={duplicateCheck}
          duplicateLoading={duplicateLoading}
          suggestions={suggestions}
          activeField={activeSuggestionField}
          onSelectSuggestion={handleSelectSuggestion}
          onClose={() => {
            setShowAddModal(false);
            setSaveError('');
            resetApplicationForm();
          }}
          onSubmit={handleAddApplication}
        />
      ) : null}
    </>
  );
}

export default ApplicationsPage;
