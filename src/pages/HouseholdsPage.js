import { useEffect, useState } from 'react';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import {
  canManageHouseholds as canManageHouseholdsByRole,
  resolveSessionRoleKey,
} from '../roleAccess';
import { supabaseService } from '../supabaseService';

function normalizeBarangayToken(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function extractHouseholdPrefix(code) {
  const match = String(code ?? '').match(/^HH-([A-Z0-9]+)-\d+$/);
  return match?.[1] ?? '';
}

function extractHouseholdSequence(code) {
  const match = String(code ?? '').match(/-(\d+)$/);
  return match ? Number(match[1]) : Number.NaN;
}

function getExistingBarangayPrefix(records, barangayName) {
  const counts = records.reduce((map, record) => {
    if (record.barangay !== barangayName) {
      return map;
    }

    const prefix = extractHouseholdPrefix(record.code);
    if (!prefix) {
      return map;
    }

    map.set(prefix, (map.get(prefix) ?? 0) + 1);
    return map;
  }, new Map());

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '';
}

function getBarangayPrefix(barangayName, barangays, records) {
  if (!barangayName) {
    return '';
  }

  const existingPrefix = getExistingBarangayPrefix(records, barangayName);
  if (existingPrefix) {
    return existingPrefix;
  }

  const selectedBarangay = barangays.find((item) => item.name === barangayName);
  const token = normalizeBarangayToken(selectedBarangay?.code || selectedBarangay?.name || barangayName);
  if (!token) {
    return 'BAR';
  }

  const barangayTokens = barangays
    .map((item) => normalizeBarangayToken(item.code || item.name))
    .filter(Boolean);

  const minimumLength = Math.min(3, token.length);
  for (let length = minimumLength; length <= token.length; length += 1) {
    const candidate = token.slice(0, length);
    const matches = barangayTokens.filter((barangayToken) => barangayToken.startsWith(candidate)).length;
    if (matches <= 1) {
      return candidate;
    }
  }

  return token;
}

function nextHouseholdCode(records, barangayName, barangays) {
  if (!barangayName) {
    return '';
  }

  const prefix = getBarangayPrefix(barangayName, barangays, records);
  const latest = records
    .filter((record) => record.barangay === barangayName)
    .map((record) => extractHouseholdSequence(record.code))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left)[0] ?? 0;

  return `HH-${prefix}-${String(latest + 1).padStart(4, '0')}`;
}

function HouseholdActions({ item, onViewProfile, onEdit, onDelete }) {
  return (
    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        size="sm"
        title={`View profile for ${item.code}`}
        onClick={onViewProfile}
      >
        View profile
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={`Edit ${item.code}`}
        onClick={onEdit}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        title={`Delete ${item.code}`}
        onClick={onDelete}
      >
        Delete
      </Button>
    </div>
  );
}

function HouseholdFormModal({
  mode,
  formState,
  barangays,
  isBarangayLocked,
  scopedBarangayName,
  errorMessage,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === 'edit';

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="records-modal__panel records-modal__panel--compact max-w-3xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Registry</span>
            <DialogTitle>{isEdit ? 'Edit household' : 'Add household'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Update household profile and registry details.
          </DialogDescription>
        </DialogHeader>

        <form className="household-form-grid gap-4" onSubmit={onSubmit}>
          <label className="settings-field" htmlFor="household-code">
            <span>Household code</span>
            <Input
              id="household-code"
              name="code"
              value={formState.code}
              onChange={onChange}
              placeholder="HH-BAR-0001"
              required
              disabled={isEdit}
            />
          </label>

          <label className="settings-field" htmlFor="household-head">
            <span>Head of family</span>
            <Input
              id="household-head"
              name="head"
              value={formState.head}
              onChange={onChange}
              placeholder="Enter full name"
              required
            />
          </label>

          <label className="settings-field" htmlFor="household-barangay">
            <span>Barangay</span>
            <select
              id="household-barangay"
              name="barangay"
              value={formState.barangay}
              onChange={onChange}
              required
              disabled={isBarangayLocked}
            >
              <option value="" disabled>Select barangay</option>
              {barangays.map((b) => (
                <option key={b.code} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            {isBarangayLocked ? <small>Locked to {scopedBarangayName || 'your assigned barangay'}.</small> : null}
          </label>

          <label className="settings-field" htmlFor="household-members">
            <span>Members</span>
            <Input
              id="household-members"
              name="members"
              type="number"
              min="1"
              value={formState.members}
              onChange={onChange}
              required
            />
          </label>

          <label className="settings-field" htmlFor="household-purok">
            <span>Purok / Sitio</span>
            <Input
              id="household-purok"
              name="purokSitio"
              value={formState.purokSitio}
              onChange={onChange}
              placeholder="Purok 3"
            />
          </label>

          <label className="settings-field household-form-grid__wide" htmlFor="household-address">
            <span>Address</span>
            <Input
              id="household-address"
              name="addressLine1"
              value={formState.addressLine1}
              onChange={onChange}
              placeholder="Street / area description"
              required
            />
          </label>

          {errorMessage ? <div className="auth-alert">{errorMessage}</div> : null}

          <div className="household-form-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Save household'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HouseholdProfileModal({ household, details, onClose }) {
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="records-modal__panel max-w-5xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Household profile</span>
            <DialogTitle>{household.code}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Review household assistance history and profile details.</DialogDescription>
        </DialogHeader>

        <div className="records-modal__summary records-modal__summary--triple">
          {details.profile.map((item) => (
            <div key={item.label} className="records-modal__card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <section className="panel panel--highlight">
          <SectionHeading eyebrow="History" title="Recent assistance history" />
          <div className="records-history">
            {details.history.length > 0 ? (
              details.history.map((item, index) => (
                <article key={`${item.date}-${item.program}-${index}`} className="records-history__item">
                  <div className="records-history__time">{item.date}</div>
                  <div className="records-history__body">
                    <strong>{item.program}</strong>
                    <p>{item.details}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="records-history__empty">No recent assistance history.</div>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function HouseholdsPage({ session }) {
  const [households, setHouseholds] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [householdForm, setHouseholdForm] = useState({
    code: '',
    head: '',
    barangay: '',
    members: '1',
    purokSitio: '',
    addressLine1: '',
    postalCode: '',
    monthlyIncome: '',
    povertyLevel: '',
  });
  const [profileHousehold, setProfileHousehold] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const canManageHouseholds = canManageHouseholdsByRole(session);
  const roleKey = resolveSessionRoleKey(session);
  const isBarangayScopedRole = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  const scopedBarangayName = session?.barangayName || '';

  useEffect(() => {
    async function initHouseholds() {
      try {
        const [data, bList] = await Promise.all([
          supabaseService.getHouseholds(),
          supabaseService.getBarangays(),
        ]);
        setHouseholds(data);
        setBarangays(bList);
        if (data.length > 0) {
          setSelectedCode(data[0].code);
        }
      } catch (error) {
        setPageError(error.message || 'Failed to load households.');
      } finally {
        setLoading(false);
      }
    }

    void initHouseholds();
  }, []);

  const resetForm = () => {
    setHouseholdForm({
      code: '',
      head: '',
      barangay: '',
      members: '1',
      purokSitio: '',
      addressLine1: '',
      postalCode: '',
      monthlyIncome: '',
      povertyLevel: '',
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'barangay' && isBarangayScopedRole) {
      return;
    }

    setHouseholdForm((current) => {
      if (name === 'barangay' && modalMode === 'add') {
        return {
          ...current,
          barangay: value,
          code: nextHouseholdCode(households, value, barangays),
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const openAddModal = () => {
    setFormError('');
    const defaultBarangay = isBarangayScopedRole
      ? (scopedBarangayName || barangays[0]?.name || '')
      : (barangays[0]?.name ?? '');
    setHouseholdForm({
      code: nextHouseholdCode(households, defaultBarangay, barangays),
      head: '',
      barangay: defaultBarangay,
      members: '1',
      purokSitio: '',
      addressLine1: '',
      postalCode: '',
      monthlyIncome: '',
      povertyLevel: '',
    });
    setModalMode('add');
  };

  const openEditModal = (row) => {
    setFormError('');
    setHouseholdForm({
      code: row.code,
      head: row.head,
      barangay: row.barangay,
      members: String(row.members),
      purokSitio: row.purokSitio || '',
      addressLine1: row.addressLine1 || '',
      postalCode: row.postalCode || '',
      monthlyIncome: row.monthlyIncome || '',
      povertyLevel: row.povertyLevel || '',
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setFormError('');
    resetForm();
  };

  const openProfileModal = async (row) => {
    setSelectedCode(row.code);
    setProfileHousehold(row);
    setProfileDetails(null);
    setPageError('');

    try {
      const details = await supabaseService.getHouseholdDetails(row.code, row);
      setProfileDetails(details);
    } catch (error) {
      setPageError(error.message || 'Failed to load household profile.');
    }
  };

  const closeProfileModal = () => {
    setProfileHousehold(null);
    setProfileDetails(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      code: householdForm.code.trim().toUpperCase(),
      head: householdForm.head.trim(),
      barangay: isBarangayScopedRole
        ? (scopedBarangayName || householdForm.barangay.trim())
        : householdForm.barangay.trim(),
      members: String(householdForm.members),
      purokSitio: householdForm.purokSitio.trim(),
      addressLine1: householdForm.addressLine1.trim(),
      postalCode: householdForm.postalCode.trim(),
      monthlyIncome: householdForm.monthlyIncome.trim(),
      povertyLevel: householdForm.povertyLevel.trim(),
    };

    setIsSubmitting(true);
    setFormError('');

    try {
      const household = modalMode === 'edit'
        ? await supabaseService.updateHousehold(payload)
        : await supabaseService.createHousehold(payload);

      setHouseholds((current) => {
        if (modalMode === 'edit') {
          return current.map((item) => (item.code === household.code ? household : item));
        }

        return [household, ...current.filter((item) => item.code !== household.code)];
      });

      setSelectedCode(household.code);

      if (profileHousehold?.code === household.code) {
        setProfileHousehold(household);
        const details = await supabaseService.getHouseholdDetails(household.code, household);
        setProfileDetails(details);
      }

      closeModal();
    } catch (error) {
      setFormError(error.message || 'Failed to save household.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code) => {
    const confirmed = window.confirm(`Delete household ${code}?`);
    if (!confirmed) {
      return;
    }

    setPageError('');

    try {
      await supabaseService.deleteHousehold(code);
      const nextHouseholds = households.filter((item) => item.code !== code);
      setHouseholds(nextHouseholds);

      if (profileHousehold?.code === code) {
        closeProfileModal();
      }

      if (selectedCode === code) {
        setSelectedCode(nextHouseholds[0]?.code ?? null);
      }
    } catch (error) {
      setPageError(error.message || 'Failed to delete household.');
    }
  };

  const columns = [
    { key: 'code', label: 'Code', render: (item) => <strong>{item.code}</strong> },
    { key: 'head', label: 'Head' },
    { key: 'barangay', label: 'Barangay' },
    { key: 'members', label: 'Members' },
    {
      key: 'openCases',
      label: 'Open cases',
      getSortValue: (item) => Number(item.openCases),
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => (
        <HouseholdActions
          item={item}
          onViewProfile={() => openProfileModal(item)}
          onEdit={canManageHouseholds ? () => openEditModal(item) : undefined}
          onDelete={canManageHouseholds ? () => handleDelete(item.code) : undefined}
        />
      ),
    },
  ];

  if (loading) {
    return <div className="workspace-page page-load-spinner">Loading households...</div>;
  }

  return (
    <>
      <div className="workspace-page space-y-4">
        <section className="panel space-y-4">
          {pageError ? <div className="auth-alert">{pageError}</div> : null}
          {isBarangayScopedRole ? (
            <div className="application-queue-note">
              <strong>Barangay view</strong>
              <p>Showing household records for {scopedBarangayName || 'your assigned barangay'} only.</p>
            </div>
          ) : null}
          <InteractiveTable
            columns={columns}
            rows={households}
            rowKey="code"
            selectedKey={selectedCode}
            onSelectRow={(row) => setSelectedCode(row.code)}
            searchLabel="Search households"
            searchPlaceholder="Search code, head, or barangay"
            toolbarActions={
              canManageHouseholds && (
                <Button type="button" onClick={openAddModal}>
                  Add household
                </Button>
              )
            }
            initialSortKey="code"
            gridTemplate="1.1fr 1.5fr 1.4fr 0.8fr 0.8fr 260px"
          />
        </section>
      </div>

      {modalMode ? (
        <HouseholdFormModal
          mode={modalMode}
          formState={householdForm}
          barangays={barangays}
          isBarangayLocked={isBarangayScopedRole}
          scopedBarangayName={scopedBarangayName}
          errorMessage={formError}
          isSubmitting={isSubmitting}
          onChange={handleFormChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      ) : null}

      {profileHousehold && profileDetails ? (
        <HouseholdProfileModal
          household={profileHousehold}
          details={profileDetails}
          onClose={closeProfileModal}
        />
      ) : null}
    </>
  );
}

export default HouseholdsPage;
