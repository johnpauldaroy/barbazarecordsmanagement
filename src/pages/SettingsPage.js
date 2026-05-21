import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import InteractiveTable from '../components/InteractiveTable';
import DistributionQuotaTab from '../components/DistributionQuotaTab';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { supabaseService } from '../supabaseService';
import {
  canManagePortalUsers as canManageUsersByRole,
  canManagePrograms as canManageProgramsByRole,
} from '../roleAccess';

function createDraftRequirement(seed = {}, index = 0) {
  return {
    id: seed.id || `draft-requirement-${Date.now()}-${index}`,
    requirementCode: seed.requirement_code || '',
    label: seed.label || '',
    description: seed.description || '',
    documentGroup: seed.document_group || '',
    isRequired: seed.is_required ?? true,
    isForHousehold: seed.is_for_household ?? false,
    allowedFileTypes: Array.isArray(seed.allowed_file_types) ? seed.allowed_file_types.join(', ') : '',
    maxFileSizeMb: String(seed.max_file_size_mb ?? 10),
    sortOrder: String(seed.sort_order ?? (index + 1) * 10),
  };
}

function createEmptyProgramForm() {
  return {
    id: '',
    code: '',
    name: '',
    category: '',
    description: '',
    eligibilitySummary: '',
    status: 'active',
    requiresReview: true,
    maxActiveApplicationsPerHousehold: '1',
    allowMultipleHouseholdBeneficiaries: false,
    sortOrder: '10',
    requirements: [createDraftRequirement({}, 0)],
  };
}

function formatStatusLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'active') {
    return 'Enabled';
  }

  if (normalized === 'inactive' || normalized === 'archived' || normalized === 'draft') {
    return 'Disabled';
  }

  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function roleRequiresBarangayAssignment(roleKey) {
  const normalizedRole = String(roleKey ?? '').trim().toLowerCase();
  return normalizedRole === 'barangay_secretary' || normalizedRole === 'barangay_staff';
}

function UserActions({ user, canManageUsers, onEdit, onDeactivate }) {
  if (!canManageUsers) {
    return <Badge variant="outline">View only</Badge>;
  }

  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={`Edit ${user.displayName}`}
        onClick={() => onEdit(user)}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        title={`Deactivate ${user.displayName}`}
        onClick={() => onDeactivate(user.id)}
      >
        Deactivate
      </Button>
    </div>
  );
}

function ProgramActions({ program, canManagePrograms, onEdit, onToggleEnabled, isToggling }) {
  if (!canManagePrograms) {
    return <Badge variant="outline">View only</Badge>;
  }

  const isEnabled = program.status === 'active' && !program.archived_at;

  return (
    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={`Edit ${program.name}`}
        disabled={isToggling}
        onClick={() => onEdit(program)}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant={isEnabled ? 'destructive' : 'default'}
        size="sm"
        title={`${isEnabled ? 'Disable' : 'Enable'} ${program.name}`}
        disabled={isToggling}
        onClick={() => onToggleEnabled(program, !isEnabled)}
      >
        {isToggling ? 'Saving...' : isEnabled ? 'Disable' : 'Enable'}
      </Button>
    </div>
  );
}

function UserFormModal({
  mode,
  roles,
  barangays,
  formState,
  onChange,
  onClose,
  onSubmit,
  isSaving,
  errorMessage,
}) {
  const isCreate = mode === 'create';
  const requiresBarangayAssignment = roleRequiresBarangayAssignment(formState.role);

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="records-modal__panel records-modal__panel--compact max-w-2xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Portal management</span>
            <DialogTitle>{isCreate ? 'Create user' : 'Edit user'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Manage portal user account details.</DialogDescription>
        </DialogHeader>

        <form className="settings-form-grid" onSubmit={onSubmit}>
          <label className="settings-field" htmlFor="user-display-name">
            <span>Display name</span>
            <input
              id="user-display-name"
              name="displayName"
              value={formState.displayName}
              onChange={onChange}
              placeholder="Full name"
              required
            />
          </label>

          <label className="settings-field" htmlFor="user-email">
            <span>Email address</span>
            <input
              id="user-email"
              type="email"
              name="email"
              value={formState.email}
              onChange={onChange}
              placeholder="name@barbaza.gov.ph"
              readOnly={!isCreate}
              required
            />
          </label>

          {isCreate ? (
            <label className="settings-field" htmlFor="user-password">
              <span>Password</span>
              <input
                id="user-password"
                type="password"
                name="password"
                value={formState.password}
                onChange={onChange}
                placeholder="Minimum 8 characters"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
          ) : null}

          <label className="settings-field" htmlFor="user-role">
            <span>Role</span>
            <select id="user-role" name="role" value={formState.role} onChange={onChange} required>
              {roles.filter((role) => ['super_admin', 'barangay_secretary'].includes(role.key)).map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field" htmlFor="user-barangay">
            <span>Assigned barangay</span>
            <select
              id="user-barangay"
              name="barangayId"
              value={formState.barangayId}
              onChange={onChange}
              required={requiresBarangayAssignment}
            >
              <option value="">No barangay assignment</option>
              {barangays.map((barangay) => (
                <option key={barangay.code} value={barangay.id ?? barangay.code}>
                  {barangay.name}
                </option>
              ))}
            </select>
            {requiresBarangayAssignment ? (
              <small>Required for barangay staff accounts.</small>
            ) : (
              <small>Leave empty for municipal or system-wide roles.</small>
            )}
          </label>

          <label className="settings-toggle-row">
            <div>
              <strong>Active status</strong>
              <p>Allow this user to sign in and perform actions.</p>
            </div>
            <button
              type="button"
              className={`settings-switch ${formState.isActive ? 'settings-switch--on' : ''}`}
              onClick={() => onChange({ target: { name: 'isActive', value: !formState.isActive } })}
            >
              <span />
            </button>
          </label>

          {errorMessage ? <div className="auth-alert">{errorMessage}</div> : null}

          <div className="settings-action-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isCreate ? 'Create user' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgramFormModal({
  mode,
  formState,
  onChange,
  onRequirementChange,
  onAddRequirement,
  onRemoveRequirement,
  onClose,
  onSubmit,
  isSaving,
  errorMessage,
}) {
  const isCreate = mode === 'create';

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="records-modal__panel max-w-5xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Program settings</span>
            <DialogTitle>{isCreate ? 'Add program' : 'Edit program'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Configure program details and requirements.</DialogDescription>
        </DialogHeader>

        <form className="settings-form-grid" onSubmit={onSubmit}>
          <label className="settings-field" htmlFor="program-code">
            <span>Program code</span>
            <input id="program-code" name="code" value={formState.code} onChange={onChange} placeholder="AICS" required />
          </label>

          <label className="settings-field" htmlFor="program-name">
            <span>Program name</span>
            <input
              id="program-name"
              name="name"
              value={formState.name}
              onChange={onChange}
              placeholder="Assistance to Individuals in Crisis Situation"
              required
            />
          </label>

          <label className="settings-field" htmlFor="program-category">
            <span>Support type</span>
            <input
              id="program-category"
              name="category"
              value={formState.category}
              onChange={onChange}
              placeholder="Emergency Assistance"
              required
            />
          </label>

          <label className="settings-field" htmlFor="program-status">
            <span>Status</span>
            <select id="program-status" name="status" value={formState.status} onChange={onChange}>
              <option value="active">Enabled</option>
              <option value="inactive">Disabled</option>
            </select>
          </label>

          <label className="settings-field" htmlFor="program-sort-order">
            <span>Sort order</span>
            <input id="program-sort-order" name="sortOrder" type="number" min="0" value={formState.sortOrder} onChange={onChange} />
          </label>

          <label className="settings-field" htmlFor="program-max-household">
            <span>Max active applications per household</span>
            <input
              id="program-max-household"
              name="maxActiveApplicationsPerHousehold"
              type="number"
              min="1"
              value={formState.maxActiveApplicationsPerHousehold}
              onChange={onChange}
            />
          </label>

          <label className="settings-field settings-form-grid__wide" htmlFor="program-description">
            <span>Description</span>
            <textarea
              id="program-description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={onChange}
              placeholder="Brief summary of the program."
            />
          </label>

          <label className="settings-field settings-form-grid__wide" htmlFor="program-eligibility">
            <span>Eligibility summary</span>
            <textarea
              id="program-eligibility"
              name="eligibilitySummary"
              rows={3}
              value={formState.eligibilitySummary}
              onChange={onChange}
              placeholder="Who qualifies for this support."
            />
          </label>

          <label className="settings-toggle-row">
            <div>
              <strong>Requires review</strong>
              <p>Keep new applications in the review workflow before final approval.</p>
            </div>
            <button
              type="button"
              className={`settings-switch ${formState.requiresReview ? 'settings-switch--on' : ''}`}
              onClick={() => onChange({ target: { name: 'requiresReview', value: !formState.requiresReview } })}
            >
              <span />
            </button>
          </label>

          <label className="settings-toggle-row">
            <div>
              <strong>Allow multiple beneficiaries per household</strong>
              <p>Enable more than one household member to benefit from this program at the same time.</p>
            </div>
            <button
              type="button"
              className={`settings-switch ${formState.allowMultipleHouseholdBeneficiaries ? 'settings-switch--on' : ''}`}
              onClick={() => onChange({
                target: {
                  name: 'allowMultipleHouseholdBeneficiaries',
                  value: !formState.allowMultipleHouseholdBeneficiaries,
                },
              })}
            >
              <span />
            </button>
          </label>

          <section className="panel panel--highlight settings-form-grid__wide">
            <div className="panel-header">
              <SectionHeading eyebrow="Requirements" title="Required attachments" />
              <div className="panel-header__actions">
                <Button type="button" onClick={onAddRequirement}>
                  Add requirement
                </Button>
              </div>
            </div>

            <div className="list-stack">
              {formState.requirements.map((requirement, index) => (
                <div key={requirement.id} className="panel panel--muted">
                  <div className="settings-form-grid">
                    <label className="settings-field" htmlFor={`requirement-label-${requirement.id}`}>
                      <span>Document label</span>
                      <input
                        id={`requirement-label-${requirement.id}`}
                        value={requirement.label}
                        onChange={(event) => onRequirementChange(requirement.id, 'label', event.target.value)}
                        placeholder="Barangay Certification"
                        required
                      />
                    </label>

                    <label className="settings-field" htmlFor={`requirement-code-${requirement.id}`}>
                      <span>Requirement code</span>
                      <input
                        id={`requirement-code-${requirement.id}`}
                        value={requirement.requirementCode}
                        onChange={(event) => onRequirementChange(requirement.id, 'requirementCode', event.target.value)}
                        placeholder="BARANGAY_CERT"
                      />
                    </label>

                    <label className="settings-field" htmlFor={`requirement-group-${requirement.id}`}>
                      <span>Document group</span>
                      <input
                        id={`requirement-group-${requirement.id}`}
                        value={requirement.documentGroup}
                        onChange={(event) => onRequirementChange(requirement.id, 'documentGroup', event.target.value)}
                        placeholder="eligibility"
                      />
                    </label>

                    <label className="settings-field" htmlFor={`requirement-sort-${requirement.id}`}>
                      <span>Sort order</span>
                      <input
                        id={`requirement-sort-${requirement.id}`}
                        type="number"
                        min="0"
                        value={requirement.sortOrder}
                        onChange={(event) => onRequirementChange(requirement.id, 'sortOrder', event.target.value)}
                      />
                    </label>

                    <label className="settings-field" htmlFor={`requirement-types-${requirement.id}`}>
                      <span>Allowed file types</span>
                      <input
                        id={`requirement-types-${requirement.id}`}
                        value={requirement.allowedFileTypes}
                        onChange={(event) => onRequirementChange(requirement.id, 'allowedFileTypes', event.target.value)}
                        placeholder="application/pdf, image/jpeg, image/png"
                      />
                    </label>

                    <label className="settings-field" htmlFor={`requirement-size-${requirement.id}`}>
                      <span>Max size (MB)</span>
                      <input
                        id={`requirement-size-${requirement.id}`}
                        type="number"
                        min="1"
                        value={requirement.maxFileSizeMb}
                        onChange={(event) => onRequirementChange(requirement.id, 'maxFileSizeMb', event.target.value)}
                      />
                    </label>

                    <label className="settings-field settings-form-grid__wide" htmlFor={`requirement-description-${requirement.id}`}>
                      <span>Description</span>
                      <textarea
                        id={`requirement-description-${requirement.id}`}
                        rows={2}
                        value={requirement.description}
                        onChange={(event) => onRequirementChange(requirement.id, 'description', event.target.value)}
                        placeholder="Describe what the attachment should contain."
                      />
                    </label>

                    <label className="settings-toggle-row">
                      <div>
                        <strong>Required</strong>
                        <p>Applicants must upload this file before submission is complete.</p>
                      </div>
                      <button
                        type="button"
                        className={`settings-switch ${requirement.isRequired ? 'settings-switch--on' : ''}`}
                        onClick={() => onRequirementChange(requirement.id, 'isRequired', !requirement.isRequired)}
                      >
                        <span />
                      </button>
                    </label>

                    <label className="settings-toggle-row">
                      <div>
                        <strong>Household document</strong>
                        <p>Mark this if one upload applies to the entire household instead of only the applicant.</p>
                      </div>
                      <button
                        type="button"
                        className={`settings-switch ${requirement.isForHousehold ? 'settings-switch--on' : ''}`}
                        onClick={() => onRequirementChange(requirement.id, 'isForHousehold', !requirement.isForHousehold)}
                      >
                        <span />
                      </button>
                    </label>

                    <div className="settings-action-row settings-form-grid__wide">
                      <Badge variant="outline">Requirement {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onRemoveRequirement(requirement.id)}
                        disabled={formState.requirements.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {errorMessage ? <div className="auth-alert settings-form-grid__wide">{errorMessage}</div> : null}

          <div className="settings-action-row settings-form-grid__wide">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isCreate ? 'Create program' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsPage({ session }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [pageError, setPageError] = useState('');
  const [programPageError, setProgramPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [programFormError, setProgramFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  const [togglingProgramId, setTogglingProgramId] = useState('');
  const [userModalMode, setUserModalMode] = useState(null);
  const [programModalMode, setProgramModalMode] = useState(null);
  const [userForm, setUserForm] = useState({
    id: '',
    displayName: '',
    email: '',
    password: '',
    role: '',
    barangayId: '',
    isActive: true,
  });
  const [programForm, setProgramForm] = useState(createEmptyProgramForm);
  const canManageUsers = canManageUsersByRole(session);
  const canManagePrograms = canManageProgramsByRole(session);
  const canManageQuotas = canManageProgramsByRole(session);

  useEffect(() => {
    let isMounted = true;

    async function fetchSettingsData() {
      setLoadingUsers(true);
      setLoadingPrograms(true);
      setPageError('');
      setProgramPageError('');

      const [userResult, roleResult, barangayResult, programResult] = await Promise.allSettled([
        supabaseService.getUsers(),
        supabaseService.getRoles(),
        supabaseService.getBarangays(),
        supabaseService.getProgramCatalog(),
      ]);

      if (!isMounted) {
        return;
      }

      if (userResult.status === 'fulfilled') {
        setUsers(userResult.value);
      } else {
        setPageError(userResult.reason?.message || 'Failed to load portal users.');
      }

      if (roleResult.status === 'fulfilled') {
        setRoles(roleResult.value);
      } else {
        setPageError((current) => current || roleResult.reason?.message || 'Failed to load roles.');
      }

      if (barangayResult.status === 'fulfilled') {
        setBarangays(barangayResult.value);
      } else {
        setPageError((current) => current || barangayResult.reason?.message || 'Failed to load barangays.');
      }

      if (programResult.status === 'fulfilled') {
        setPrograms(programResult.value);
      } else {
        setProgramPageError(programResult.reason?.message || 'Failed to load program settings.');
      }

      setLoadingUsers(false);
      setLoadingPrograms(false);
    }

    void fetchSettingsData();

    return () => {
      isMounted = false;
    };
  }, []);

  const roleNameByKey = useMemo(
    () => new Map(roles.map((role) => [role.key, role.name])),
    [roles]
  );

  const handleUserFormChange = (event) => {
    const { name, value } = event.target;
    setUserForm((current) => {
      if (name === 'role') {
        const requiresBarangay = roleRequiresBarangayAssignment(value);

        return {
          ...current,
          role: value,
          barangayId: requiresBarangay
            ? (current.barangayId || barangays[0]?.id || barangays[0]?.code || '')
            : '',
        };
      }

      if (name === 'isActive') {
        return { ...current, isActive: Boolean(value) };
      }

      return { ...current, [name]: value };
    });
  };

  const handleProgramFormChange = (event) => {
    const { name, value } = event.target;
    setProgramForm((current) => ({ ...current, [name]: value }));
  };

  const handleRequirementChange = (requirementId, field, value) => {
    setProgramForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement) => (
        requirement.id === requirementId
          ? { ...requirement, [field]: value }
          : requirement
      )),
    }));
  };

  const addRequirement = () => {
    setProgramForm((current) => ({
      ...current,
      requirements: [
        ...current.requirements,
        createDraftRequirement({}, current.requirements.length),
      ],
    }));
  };

  const removeRequirement = (requirementId) => {
    setProgramForm((current) => {
      const nextRequirements = current.requirements.filter((requirement) => requirement.id !== requirementId);
      return {
        ...current,
        requirements: nextRequirements.length ? nextRequirements : [createDraftRequirement({}, 0)],
      };
    });
  };

  const openCreateUser = () => {
    if (!canManageUsers) {
      return;
    }

    const residentRole = roles.find((role) => role.key === 'resident');
    const defaultRole = residentRole?.key || roles[0]?.key || '';
    const defaultBarangayId = roleRequiresBarangayAssignment(defaultRole)
      ? (barangays[0]?.id || barangays[0]?.code || '')
      : '';

    setUserModalMode('create');
    setFormError('');
    setUserForm({
      id: '',
      displayName: '',
      email: '',
      password: '',
      role: defaultRole,
      barangayId: defaultBarangayId,
      isActive: true,
    });
  };

  const openEditUser = (user) => {
    if (!canManageUsers) {
      return;
    }

    setUserModalMode('edit');
    setFormError('');
    setUserForm({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      password: '',
      role: user.role,
      barangayId: user.barangayId || '',
      isActive: user.isActive,
    });
  };

  const closeUserModal = () => {
    setUserModalMode(null);
    setFormError('');
  };

  const openCreateProgram = () => {
    if (!canManagePrograms) {
      return;
    }

    setProgramModalMode('create');
    setProgramFormError('');
    setProgramForm(createEmptyProgramForm());
  };

  const openEditProgram = (program) => {
    if (!canManagePrograms) {
      return;
    }

    setProgramModalMode('edit');
    setProgramFormError('');
    setProgramForm({
      id: program.id,
      code: program.code || '',
      name: program.name || '',
      category: program.category || '',
      description: program.description || '',
      eligibilitySummary: program.eligibility_summary || '',
      status: program.status === 'active' && !program.archived_at ? 'active' : 'inactive',
      requiresReview: program.requires_review ?? true,
      maxActiveApplicationsPerHousehold: String(program.max_active_applications_per_household ?? 1),
      allowMultipleHouseholdBeneficiaries: program.allow_multiple_household_beneficiaries ?? false,
      sortOrder: String(program.sort_order ?? 0),
      requirements: (program.requirements?.length
        ? program.requirements.map((requirement, index) => createDraftRequirement(requirement, index))
        : [createDraftRequirement({}, 0)]),
    });
  };

  const closeProgramModal = () => {
    setProgramModalMode(null);
    setProgramFormError('');
    setProgramForm(createEmptyProgramForm());
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();

    if (!canManageUsers) {
      setFormError('Only admin accounts can manage portal users.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const selectedBarangay = barangays.find(
        (item) => (item.id || item.code) === userForm.barangayId
      );
      const requiresBarangayAssignment = roleRequiresBarangayAssignment(userForm.role);

      if (requiresBarangayAssignment && !userForm.barangayId) {
        throw new Error('Assigned barangay is required for barangay staff roles.');
      }

      if (userModalMode === 'create') {
        if (!userForm.password || userForm.password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }

        const createdUser = await supabaseService.createUser(userForm);
        setUsers((current) => [
          {
            id: createdUser?.id || `draft-${Date.now()}`,
            displayName: createdUser?.displayName || userForm.displayName,
            email: createdUser?.email || userForm.email,
            role: createdUser?.role || userForm.role,
            roleName: createdUser?.roleName || roleNameByKey.get(userForm.role) || userForm.role,
            isActive: createdUser?.isActive ?? userForm.isActive,
            lastSignIn: createdUser?.lastSignIn ?? null,
            barangayId: createdUser?.barangayId ?? userForm.barangayId ?? null,
            barangayCode: createdUser?.barangayCode || selectedBarangay?.code || null,
            barangayName: createdUser?.barangayName || selectedBarangay?.name || null,
          },
          ...current,
        ]);
      } else {
        await supabaseService.updateUser(userForm.id, userForm);
        setUsers((current) => current.map((user) => (
          user.id === userForm.id
            ? {
                ...user,
                displayName: userForm.displayName,
                role: userForm.role,
                roleName: roleNameByKey.get(userForm.role) || userForm.role,
                isActive: userForm.isActive,
                barangayId: requiresBarangayAssignment ? (userForm.barangayId || null) : null,
                barangayCode: requiresBarangayAssignment ? (selectedBarangay?.code || null) : null,
                barangayName: requiresBarangayAssignment ? (selectedBarangay?.name || null) : null,
              }
            : user
        )));
      }
      closeUserModal();
    } catch (error) {
      setFormError(error.message || 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!canManageUsers) {
      setPageError('Only admin accounts can manage portal users.');
      return;
    }

    if (!window.confirm('Deactivate this user? They will no longer be able to sign in.')) {
      return;
    }

    setPageError('');

    try {
      await supabaseService.deleteUser(userId);
      setUsers((current) => current.map((user) => (
        user.id === userId ? { ...user, isActive: false } : user
      )));
    } catch (error) {
      setPageError(error.message || 'Failed to deactivate user.');
    }
  };

  const handleProgramSubmit = async (event) => {
    event.preventDefault();

    if (!canManagePrograms) {
      setProgramFormError('Only admin accounts can manage program settings.');
      return;
    }

    setIsSavingProgram(true);
    setProgramFormError('');

    try {
      await supabaseService.saveProgramConfig(programForm);
      const programRows = await supabaseService.getProgramCatalog();
      setPrograms(programRows);
      closeProgramModal();
    } catch (error) {
      setProgramFormError(error.message || 'Failed to save program settings.');
    } finally {
      setIsSavingProgram(false);
    }
  };

  const handleToggleProgramEnabled = async (program, shouldEnable) => {
    if (!canManagePrograms) {
      setProgramPageError('Only admin accounts can manage program settings.');
      return;
    }

    if (togglingProgramId) {
      return;
    }

    setProgramPageError('');
    setTogglingProgramId(program.id);

    try {
      await supabaseService.setProgramEnabled(program.id, shouldEnable);
      const programRows = await supabaseService.getProgramCatalog();
      setPrograms(programRows);
    } catch (error) {
      setProgramPageError(error.message || `Failed to ${shouldEnable ? 'enable' : 'disable'} program.`);
    } finally {
      setTogglingProgramId('');
    }
  };

  return (
    <div className="workspace-page">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="workspace-page">
        <section className="panel settings-tabs-shell">
          <TabsList className="settings-tablist" aria-label="Settings sections">
            <TabsTrigger id="settings-tab-users" className="settings-tab" value="users">
              <strong>Users</strong>
            </TabsTrigger>
            <TabsTrigger id="settings-tab-programs" className="settings-tab" value="programs">
              <strong>Programs</strong>
            </TabsTrigger>
            <TabsTrigger id="settings-tab-distributions" className="settings-tab" value="distributions">
              <strong>Distributions</strong>
            </TabsTrigger>
          </TabsList>
        </section>

        <TabsContent value="users" className="mt-0">
          <section className="panel" id="settings-panel-users" role="tabpanel" aria-labelledby="settings-tab-users">
            <div className="panel-header">
              <SectionHeading title="Portal users" />
            </div>

            {pageError ? <div className="auth-alert">{pageError}</div> : null}

            <div className="settings-stack">
              <InteractiveTable
                columns={[
                  { key: 'displayName', label: 'User' },
                  {
                    key: 'role',
                    label: 'Role',
                    render: (row) => (
                      <Badge variant="outline">
                        {row.roleName || roleNameByKey.get(row.role) || row.role}
                      </Badge>
                    ),
                  },
                  {
                    key: 'barangayName',
                    label: 'Assigned barangay',
                    render: (row) => row.barangayName || 'System-wide',
                  },
                  {
                    key: 'isActive',
                    label: 'Status',
                    render: (row) => (
                      <Badge variant={row.isActive ? 'default' : 'secondary'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row) => (
                      <UserActions
                        user={row}
                        canManageUsers={canManageUsers}
                        onEdit={openEditUser}
                        onDeactivate={handleDeactivateUser}
                      />
                    ),
                  },
                ]}
                rows={users}
                rowKey="id"
                searchLabel="Search users"
                searchPlaceholder="Search user, email, or role"
                toolbarActions={canManageUsers ? (
                  <Button type="button" onClick={openCreateUser}>
                    Create user
                  </Button>
                ) : null}
                emptyMessage={loadingUsers ? 'Loading users...' : 'No users found.'}
                gridTemplate="1.5fr 1fr 1.2fr 1fr 1fr"
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="programs" className="mt-0">
          <section className="panel" id="settings-panel-programs" role="tabpanel" aria-labelledby="settings-tab-programs">
            <div className="panel-header">
              <SectionHeading title="Programs" />
              <div className="panel-header__actions">
                {canManagePrograms ? (
                  <Button type="button" onClick={openCreateProgram}>
                    Add program
                  </Button>
                ) : null}
              </div>
            </div>

            {programPageError ? <div className="auth-alert">{programPageError}</div> : null}

            <InteractiveTable
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Program' },
                { key: 'category', label: 'Support type' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <Badge variant={row.status === 'active' && !row.archived_at ? 'default' : 'secondary'}>
                      {formatStatusLabel(row.archived_at ? 'archived' : row.status)}
                    </Badge>
                  ),
                },
                {
                  key: 'requirements',
                  label: 'Attachments',
                  render: (row) => <span>{row.requirements?.length || 0}</span>,
                  getSortValue: (row) => row.requirements?.length || 0,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <ProgramActions
                      program={row}
                      canManagePrograms={canManagePrograms}
                      onEdit={openEditProgram}
                      onToggleEnabled={handleToggleProgramEnabled}
                      isToggling={togglingProgramId === row.id}
                    />
                  ),
                },
              ]}
              rows={programs}
              rowKey="id"
              searchLabel="Search programs"
              searchPlaceholder="Search code, program, or support type"
              emptyMessage={loadingPrograms ? 'Loading programs...' : 'No programs configured.'}
              gridTemplate="0.8fr 1.6fr 1.3fr 0.8fr 0.7fr 1fr"
            />
          </section>
        </TabsContent>

        <TabsContent value="distributions" className="mt-0">
          <section className="panel" id="settings-panel-distributions" role="tabpanel" aria-labelledby="settings-tab-distributions">
            <DistributionQuotaTab
              barangays={barangays}
              programs={programs}
              canManageQuotas={canManageQuotas}
            />
          </section>
        </TabsContent>
      </Tabs>

      {userModalMode ? (
        <UserFormModal
          mode={userModalMode}
          roles={roles}
          barangays={barangays}
          formState={userForm}
          onChange={handleUserFormChange}
          onClose={closeUserModal}
          onSubmit={handleUserSubmit}
          isSaving={isSaving}
          errorMessage={formError}
        />
      ) : null}

      {programModalMode ? (
        <ProgramFormModal
          mode={programModalMode}
          formState={programForm}
          onChange={handleProgramFormChange}
          onRequirementChange={handleRequirementChange}
          onAddRequirement={addRequirement}
          onRemoveRequirement={removeRequirement}
          onClose={closeProgramModal}
          onSubmit={handleProgramSubmit}
          isSaving={isSavingProgram}
          errorMessage={programFormError}
        />
      ) : null}
    </div>
  );
}

export default SettingsPage;
