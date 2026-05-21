import { useEffect, useState } from 'react';
import InteractiveTable from './InteractiveTable';
import SectionHeading from './SectionHeading';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { supabaseService } from '../supabaseService';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR];

function createEmptyForm(year) {
  return {
    quotaId: '',
    barangayId: '',
    programId: '',
    year: String(year ?? CURRENT_YEAR),
    maxBeneficiaries: '',
    notes: '',
  };
}

function QuotaProgressBar({ used, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const tone = used >= max ? 'full' : used >= max * 0.8 ? 'warning' : 'ok';
  const barColor = tone === 'full' ? '#dc2626' : tone === 'warning' ? '#d97706' : '#16a34a';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        title={`${used} of ${max} slots used (${pct}%)`}
        style={{
          flex: 1,
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: barColor,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: barColor,
          whiteSpace: 'nowrap',
        }}
      >
        {used}/{max}
      </span>
    </div>
  );
}

function QuotaFormModal({ mode, barangays, programs, formState, onChange, onClose, onSubmit, isSaving, errorMessage }) {
  if (!mode) return null;
  const isEdit = mode === 'edit';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="records-modal__panel records-modal__panel--compact max-w-2xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Distribution settings</span>
            <DialogTitle>{isEdit ? 'Edit quota' : 'Set distribution quota'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Set the maximum number of beneficiaries for a barangay and program combination.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="settings-form-grid" noValidate>
          <label className="settings-field" htmlFor="quota-barangay">
            <span>Barangay</span>
            <select
              id="quota-barangay"
              name="barangayId"
              value={formState.barangayId}
              onChange={onChange}
              disabled={isEdit}
              required
            >
              <option value="">Select barangay</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className="settings-field" htmlFor="quota-program">
            <span>Program</span>
            <select
              id="quota-program"
              name="programId"
              value={formState.programId}
              onChange={onChange}
              disabled={isEdit}
              required
            >
              <option value="">Select program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </label>

          <label className="settings-field" htmlFor="quota-year">
            <span>Year</span>
            <select
              id="quota-year"
              name="year"
              value={formState.year}
              onChange={onChange}
              disabled={isEdit}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>

          <label className="settings-field" htmlFor="quota-max">
            <span>Max beneficiaries (slots)</span>
            <input
              id="quota-max"
              type="number"
              name="maxBeneficiaries"
              value={formState.maxBeneficiaries}
              onChange={onChange}
              min="0"
              placeholder="e.g. 50"
              required
            />
          </label>

          <label className="settings-field settings-form-grid__wide" htmlFor="quota-notes">
            <span>Notes (optional)</span>
            <input
              id="quota-notes"
              type="text"
              name="notes"
              value={formState.notes}
              onChange={onChange}
              maxLength={255}
              placeholder="e.g. Per LGU directive"
            />
          </label>

          {errorMessage ? <div className="auth-alert settings-form-grid__wide">{errorMessage}</div> : null}

          <div className="settings-action-row">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save quota'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DistributionQuotaTab({ barangays, programs, canManageQuotas }) {
  const [quotas, setQuotas] = useState([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(() => createEmptyForm(CURRENT_YEAR));
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadQuotas(year) {
    setLoading(true);
    setPageError('');
    try {
      const data = await supabaseService.getBarangayProgramQuotas(year);
      setQuotas(data);
    } catch (err) {
      setPageError(err.message || 'Failed to load quotas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotas(selectedYear);
  }, [selectedYear]);

  function openCreate() {
    setForm(createEmptyForm(selectedYear));
    setFormError('');
    setModalMode('create');
  }

  function openEdit(row) {
    setForm({
      quotaId: row.quota_id,
      barangayId: row.barangay_id,
      programId: row.program_id,
      year: String(row.period_year),
      maxBeneficiaries: String(row.max_beneficiaries),
      notes: row.notes ?? '',
    });
    setFormError('');
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setFormError('');
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!form.barangayId) { setFormError('Please select a barangay.'); return; }
    if (!form.programId) { setFormError('Please select a program.'); return; }
    if (form.maxBeneficiaries === '' || isNaN(Number(form.maxBeneficiaries))) {
      setFormError('Please enter a valid number for max beneficiaries.');
      return;
    }

    setIsSaving(true);
    try {
      await supabaseService.upsertBarangayProgramQuota({
        barangayId: form.barangayId,
        programId: form.programId,
        year: form.year,
        maxBeneficiaries: form.maxBeneficiaries,
        notes: form.notes,
      });
      closeModal();
      await loadQuotas(selectedYear);
    } catch (err) {
      setFormError(err.message || 'Failed to save quota.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(quotaId) {
    setConfirmDeleteId(null);
    setPageError('');
    try {
      await supabaseService.deleteBarangayProgramQuota(quotaId);
      await loadQuotas(selectedYear);
    } catch (err) {
      setPageError(err.message || 'Failed to remove quota.');
    }
  }

  const columns = [
    { key: 'barangay_name', label: 'Barangay' },
    {
      key: 'program_name',
      label: 'Program',
      render: (row) => (
        <span>
          <Badge variant="outline" style={{ marginRight: '6px' }}>{row.program_code}</Badge>
          {row.program_name}
        </span>
      ),
    },
    { key: 'period_year', label: 'Year' },
    {
      key: 'max_beneficiaries',
      label: 'Quota',
      render: (row) => <span style={{ fontWeight: 600 }}>{row.max_beneficiaries}</span>,
      getSortValue: (row) => row.max_beneficiaries,
    },
    {
      key: 'used_count',
      label: 'Used',
      render: (row) => <span>{Number(row.used_count)}</span>,
      getSortValue: (row) => Number(row.used_count),
    },
    {
      key: 'remaining_count',
      label: 'Remaining',
      render: (row) => {
        const remaining = Number(row.remaining_count);
        const max = row.max_beneficiaries;
        const isFull = remaining <= 0;
        return (
          <Badge variant={isFull ? 'destructive' : remaining <= Math.max(1, max * 0.2) ? 'secondary' : 'default'}>
            {remaining}
          </Badge>
        );
      },
      getSortValue: (row) => Number(row.remaining_count),
    },
    {
      key: 'progress',
      label: 'Usage',
      render: (row) => (
        <QuotaProgressBar used={Number(row.used_count)} max={row.max_beneficiaries} />
      ),
      getSortValue: (row) => Number(row.used_count) / Math.max(1, row.max_beneficiaries),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        if (!canManageQuotas) return <Badge variant="outline">View only</Badge>;
        return (
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteId(row.quota_id)}
            >
              Remove
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="panel-header">
        <SectionHeading title="Barangay distribution quotas" />
        <div className="panel-header__actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="quota-year-select" style={{ fontSize: '13px', fontWeight: 500 }}>Year:</label>
          <select
            id="quota-year-select"
            className="settings-field__input"
            style={{ width: 'auto', minWidth: '90px' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {canManageQuotas ? (
            <Button type="button" onClick={openCreate}>
              Set quota
            </Button>
          ) : null}
        </div>
      </div>

      {pageError ? <div className="auth-alert">{pageError}</div> : null}

      <div className="settings-stack">
        <InteractiveTable
          columns={columns}
          rows={quotas}
          rowKey="quota_id"
          searchLabel="Search quotas"
          searchPlaceholder="Search barangay or program"
          emptyMessage={loading ? 'Loading quotas...' : 'No distribution quotas set for this year.'}
          gridTemplate="1.2fr 1.8fr 0.6fr 0.7fr 0.6fr 0.8fr 1.4fr 1fr"
        />
      </div>

      <QuotaFormModal
        mode={modalMode}
        barangays={barangays}
        programs={programs}
        formState={form}
        onChange={handleFormChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        errorMessage={formError}
      />

      {confirmDeleteId ? (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
          <DialogContent className="records-modal__panel records-modal__panel--compact max-w-md">
            <DialogHeader className="records-modal__header">
              <div>
                <span className="section-eyebrow">Distribution settings</span>
                <DialogTitle>Remove quota</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Confirm quota removal.</DialogDescription>
            </DialogHeader>
            <p style={{ fontSize: '14px', color: 'var(--ui-text-soft)', margin: '0 0 1rem' }}>
              Are you sure you want to remove this quota entry? You can always set a new one.
            </p>
            <div className="settings-action-row">
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => handleDelete(confirmDeleteId)}>
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export default DistributionQuotaTab;
