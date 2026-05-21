import { useEffect, useRef, useState } from 'react';
import { getHashQueryParams } from '../routes';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { MoreHorizontal } from 'lucide-react';
import { classifyIncome } from '../incomeClassification';
import {
  canManageHouseholds as canManageHouseholdsByRole,
  resolveSessionRoleKey,
} from '../roleAccess';
import { supabaseService } from '../supabaseService';

function IncomeBadge({ monthlyIncome }) {
  const tier = classifyIncome(monthlyIncome);
  return (
    <span
      className="income-badge"
      style={{ background: tier.bgColor, color: tier.textColor, borderColor: tier.color }}
      title={tier.range}
    >
      {tier.tupadPriority ? 'Recommended to TUPAD - ' : ''}{tier.label}
    </span>
  );
}

function getIncomeClassificationLabel(monthlyIncome, fourPs = null) {
  const tier = classifyIncome(monthlyIncome);
  const parts = [];
  if (tier.tupadPriority) {
    parts.push(`${tier.label} - Recommended for TUPAD`);
  } else {
    parts.push(tier.label);
  }

  if (fourPs?.isQualified) {
    const childCount = Number(fourPs.qualifyingChildrenCount ?? 0);
    parts.push(
      childCount > 0
        ? `Qualified for 4Ps (${childCount} child${childCount > 1 ? 'ren' : ''}, ages 5-18)`
        : 'Qualified for 4Ps'
    );
  }

  return parts.join(' · ');
}

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ helpers Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬

function normalizeBarangayToken(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
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
    if (record.barangay !== barangayName) return map;
    const prefix = extractHouseholdPrefix(record.code);
    if (!prefix) return map;
    map.set(prefix, (map.get(prefix) ?? 0) + 1);
    return map;
  }, new Map());
  return [...counts.entries()].sort((l, r) => r[1] - l[1])[0]?.[0] ?? '';
}

function getBarangayPrefix(barangayName, barangays, records) {
  if (!barangayName) return '';
  const existingPrefix = getExistingBarangayPrefix(records, barangayName);
  if (existingPrefix) return existingPrefix;
  const selectedBarangay = barangays.find((item) => item.name === barangayName);
  const token = normalizeBarangayToken(selectedBarangay?.code || selectedBarangay?.name || barangayName);
  if (!token) return 'BAR';
  const barangayTokens = barangays.map((item) => normalizeBarangayToken(item.code || item.name)).filter(Boolean);
  const minimumLength = Math.min(3, token.length);
  for (let length = minimumLength; length <= token.length; length += 1) {
    const candidate = token.slice(0, length);
    const matches = barangayTokens.filter((t) => t.startsWith(candidate)).length;
    if (matches <= 1) return candidate;
  }
  return token;
}

function nextHouseholdCode(records, barangayName, barangays) {
  if (!barangayName) return '';
  const prefix = getBarangayPrefix(barangayName, barangays, records);
  const latest = records
    .filter((r) => r.barangay === barangayName)
    .map((r) => extractHouseholdSequence(r.code))
    .filter((v) => Number.isFinite(v))
    .sort((l, r) => r - l)[0] ?? 0;
  return `HH-${prefix}-${String(latest + 1).padStart(4, '0')}`;
}

function computeAge(dateOfBirth) {
  if (!dateOfBirth) return '';
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? String(age) : '';
}

function isCurrentlyStudyingFromValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'not currently studying';
}

function formatHeadName(form) {
  return [form.headFirstName, form.headMiddleName, form.headLastName, form.headSuffix]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
}

function formatMemberName(member) {
  return [member.firstName, member.middleName, member.lastName, member.suffix]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(' ') || '-';
}

const LUMON_HEAD_KEY = '__head__';

function getLumonMemberKey(member, index) {
  const rawId = String(member?._id ?? '').trim();
  return rawId || `member-${index}`;
}

function getLumonMemberChoices(formState) {
  const headName = formatHeadName(formState) || formState.code || 'Head of household';
  const choices = [{ key: LUMON_HEAD_KEY, label: `${headName} (Head)` }];

  for (let index = 0; index < formState.familyMembers.length; index += 1) {
    const member = formState.familyMembers[index];
    const memberName = formatMemberName(member);
    const relationship = String(member.relationship || 'Family member').trim();
    choices.push({
      key: getLumonMemberKey(member, index),
      label: `${memberName} (${relationship})`,
    });
  }

  return choices;
}

function sanitizeLumonMemberKeys(keys, choices) {
  const allowed = new Set((choices ?? []).map((choice) => choice.key));
  const unique = [];
  for (const key of keys ?? []) {
    const normalized = String(key ?? '').trim();
    if (!normalized || !allowed.has(normalized) || unique.includes(normalized)) {
      continue;
    }
    unique.push(normalized);
  }
  return unique;
}

function deriveLumonMemberNames(choices, selectedKeys) {
  const selected = new Set(selectedKeys ?? []);
  return (choices ?? [])
    .filter((choice) => selected.has(choice.key))
    .map((choice) => choice.label);
}

function newMember() {
  return {
    _id: `${Date.now()}-${Math.random()}`,
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    relationship: '',
    dateOfBirth: '',
    gender: '',
    civilStatus: '',
    religion: '',
    contactNumber: '',
    currentlyStudying: false,
    schoolBackground: '',
    occupation: '',
    monthlyIncome: '',
  };
}

const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
const GENDER_OPTIONS = ['', 'Male', 'Female', 'Prefer not to say'];
const CIVIL_STATUS_OPTIONS = ['', 'Single', 'Married', 'Widowed', 'Separated', 'Annulled'];
const RELATIONSHIP_OPTIONS = [
  '',
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Grandchild',
  'Uncle',
  'Aunt',
  'Nephew',
  'Niece',
  'Cousin',
  'Son-in-law',
  'Daughter-in-law',
  'Other relative',
  'Non-relative',
];
const RELIGION_OPTIONS = [
  '',
  'Roman Catholic',
  'Iglesia ni Cristo',
  'Islam',
  'Born Again Christian',
  'Seventh-day Adventist',
  'Aglipayan',
  'Baptist',
  'Jehovah\'s Witnesses',
  'Methodist',
  'Pentecostal',
  'Protestant',
  'Other',
];

const EMPTY_FORM = {
  code: '',
  barangay: '',
  purokSitio: '',
  addressLine1: '',
  latitude: '',
  longitude: '',
  headLastName: '',
  headFirstName: '',
  headMiddleName: '',
  headSuffix: '',
  headDateOfBirth: '',
  headGender: '',
  headCivilStatus: '',
  headReligion: '',
  headContactNumber: '',
  headCurrentlyStudying: false,
  headSchoolBackground: '',
  headOccupation: '',
  headMonthlyIncome: '',
  familyMembers: [],
  isLumon: false,
  lumonFamilyCount: '1',
  lumonDescription: '',
  lumonMemberKeys: [],
  lumonMemberNames: [],
};

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ sub-components Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬

function FieldRow({ label, htmlFor, children, wide }) {
  return (
    <label className={`settings-field${wide ? ' household-form-grid__wide' : ''}`} htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SelectField({ id, name, value, onChange, options, disabled, placeholder }) {
  return (
    <select id={id} name={name} value={value} onChange={onChange} disabled={disabled}>
      {placeholder !== false && <option value="">{placeholder || 'Select...'}</option>}
      {options.filter(Boolean).map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function MemberRow({ member, onEdit, onRemove }) {
  const age = computeAge(member.dateOfBirth);
  return (
    <div className="hh-member-row">
      <div className="hh-member-row__info">
        <strong>{formatMemberName(member)}</strong>
        <span>{member.relationship || 'Member'}{age ? ` · ${age} yrs` : ''}{member.gender ? ` · ${member.gender}` : ''}</span>
      </div>
      <div className="hh-member-row__actions">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>Edit</Button>
        <Button type="button" variant="destructive" size="sm" onClick={onRemove}>Remove</Button>
      </div>
    </div>
  );
}

function MemberForm({ member, onChange, onSave, onCancel }) {
  const age = computeAge(member.dateOfBirth);

  function field(name) {
    return {
      name,
      value: member[name] ?? '',
      onChange: (e) => onChange(name, e.target.value),
    };
  }

  return (
    <div className="hh-member-form">
      <div className="hh-member-form__grid">
        <FieldRow label="Last name" htmlFor="mf-last"><Input id="mf-last" {...field('lastName')} required /></FieldRow>
        <FieldRow label="First name" htmlFor="mf-first"><Input id="mf-first" {...field('firstName')} required /></FieldRow>
        <FieldRow label="Middle name" htmlFor="mf-mid"><Input id="mf-mid" {...field('middleName')} /></FieldRow>
        <FieldRow label="Suffix" htmlFor="mf-suffix">
          <SelectField id="mf-suffix" {...field('suffix')} options={SUFFIX_OPTIONS} />
        </FieldRow>
        <FieldRow label="Relationship to head" htmlFor="mf-rel">
          <SelectField id="mf-rel" {...field('relationship')} options={RELATIONSHIP_OPTIONS} />
        </FieldRow>
        <FieldRow label="Date of birth" htmlFor="mf-dob">
          <Input id="mf-dob" type="date" {...field('dateOfBirth')} />
        </FieldRow>
        <FieldRow label="Age (computed)" htmlFor="mf-age">
          <Input id="mf-age" value={age} readOnly placeholder="-" tabIndex={-1} />
        </FieldRow>
        <FieldRow label="Gender" htmlFor="mf-gender">
          <SelectField id="mf-gender" {...field('gender')} options={GENDER_OPTIONS} />
        </FieldRow>
        <FieldRow label="Civil status" htmlFor="mf-civil">
          <SelectField id="mf-civil" {...field('civilStatus')} options={CIVIL_STATUS_OPTIONS} />
        </FieldRow>
        <FieldRow label="Religion" htmlFor="mf-rel2">
          <SelectField id="mf-rel2" {...field('religion')} options={RELIGION_OPTIONS} />
        </FieldRow>
        <FieldRow label="Contact number" htmlFor="mf-contact"><Input id="mf-contact" type="tel" {...field('contactNumber')} /></FieldRow>
        <FieldRow label="Occupation" htmlFor="mf-occ"><Input id="mf-occ" {...field('occupation')} /></FieldRow>
        <FieldRow label="Monthly income (PHP)" htmlFor="mf-income"><Input id="mf-income" type="number" min="0" {...field('monthlyIncome')} /></FieldRow>
        <label className="hh-checkbox-field household-form-grid__wide" htmlFor="mf-currently-studying">
          <input
            id="mf-currently-studying"
            type="checkbox"
            checked={Boolean(member.currentlyStudying)}
            onChange={(event) => onChange('currentlyStudying', event.target.checked)}
          />
          <span>Currently studying?</span>
        </label>
        {member.currentlyStudying ? (
          <FieldRow label="School name" htmlFor="mf-school" wide>
            <Input id="mf-school" {...field('schoolBackground')} placeholder="Enter school name" />
          </FieldRow>
        ) : null}
      </div>
      <div className="hh-member-form__actions">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" onClick={onSave}>Save member</Button>
      </div>
    </div>
  );
}

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ HouseholdFormModal Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬

function HouseholdFormModal({
  mode,
  formState,
  barangays,
  isBarangayLocked,
  scopedBarangayName,
  errorMessage,
  isSubmitting,
  onChange,
  onMemberChange,
  onAddMember,
  onSaveMember,
  onCancelMember,
  onRemoveMember,
  onEditMember,
  editingMemberIndex,
  draftMember,
  onDraftMemberChange,
  onToggleLumonMember,
  onUseCurrentLocation,
  isLocatingGeo,
  geoError,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === 'edit';
  const age = computeAge(formState.headDateOfBirth);
  const totalMembers = 1 + formState.familyMembers.length;
  const lumonChoices = getLumonMemberChoices(formState);
  const selectedLumonMembers = new Set(formState.lumonMemberKeys ?? []);
  const latitude = Number(formState.latitude);
  const longitude = Number(formState.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const openInMapUrl = hasValidCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : '';

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="records-modal__panel max-w-4xl household-form-dialog">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Registry</span>
            <DialogTitle>{isEdit ? 'Edit household' : 'Add household'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {isEdit ? 'Update household profile and registry details.' : 'Register a new household.'}
          </DialogDescription>
        </DialogHeader>

        <form className="household-form-scroll" onSubmit={onSubmit}>

          {/* Ã¢"â‚¬Ã¢"â‚¬ Section 1: Household details Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ */}
          <div className="household-form-section">
            <p className="household-form-section__label">Household details</p>
            <div className="household-form-grid gap-4">
              <FieldRow label="Household code" htmlFor="hh-code">
                <Input
                  id="hh-code"
                  name="code"
                  value={formState.code}
                  onChange={onChange}
                  placeholder="HH-BAR-0001"
                  required
                  disabled={isEdit}
                />
              </FieldRow>
              <FieldRow label="Barangay" htmlFor="hh-barangay">
                <select
                  id="hh-barangay"
                  name="barangay"
                  value={formState.barangay}
                  onChange={onChange}
                  required
                  disabled={isBarangayLocked}
                >
                  <option value="" disabled>Select barangay</option>
                  {barangays.map((b) => (
                    <option key={b.code} value={b.name}>{b.name}</option>
                  ))}
                </select>
                {isBarangayLocked ? <small>Locked to {scopedBarangayName || 'your assigned barangay'}.</small> : null}
              </FieldRow>
              <FieldRow label="Purok / Sitio" htmlFor="hh-purok">
                <Input id="hh-purok" name="purokSitio" value={formState.purokSitio} onChange={onChange} placeholder="Purok 3" />
              </FieldRow>
              <FieldRow label="Address" htmlFor="hh-address" wide>
                <Input id="hh-address" name="addressLine1" value={formState.addressLine1} onChange={onChange} placeholder="Street / area description" required />
              </FieldRow>
              <FieldRow label="Latitude" htmlFor="hh-lat">
                <Input
                  id="hh-lat"
                  name="latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={formState.latitude}
                  onChange={onChange}
                  placeholder="e.g. 11.195867"
                />
              </FieldRow>
              <FieldRow label="Longitude" htmlFor="hh-lng">
                <Input
                  id="hh-lng"
                  name="longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={formState.longitude}
                  onChange={onChange}
                  placeholder="e.g. 122.038931"
                />
              </FieldRow>
              <div className="household-form-grid__wide hh-geotag-actions">
                <div className="hh-geotag-actions__row">
                  <Button type="button" variant="outline" size="sm" onClick={onUseCurrentLocation} disabled={isLocatingGeo}>
                    {isLocatingGeo ? 'Locating...' : 'Use current location'}
                  </Button>
                  {hasValidCoordinates ? (
                    <a href={openInMapUrl} target="_blank" rel="noopener noreferrer" className="hh-geotag-link">
                      Open in map
                    </a>
                  ) : null}
                </div>
                <small>Coordinates are used to point this household on the Land Map.</small>
                {geoError ? <small className="auth-alert">{geoError}</small> : null}
              </div>
            </div>
          </div>

          {/* Ã¢"â‚¬Ã¢"â‚¬ Section 2: Head of household Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ */}
          <div className="household-form-section">
            <p className="household-form-section__label">Head of household</p>
            <div className="household-form-grid gap-4">
              <FieldRow label="Last name" htmlFor="hh-hlast">
                <Input id="hh-hlast" name="headLastName" value={formState.headLastName} onChange={onChange} required />
              </FieldRow>
              <FieldRow label="First name" htmlFor="hh-hfirst">
                <Input id="hh-hfirst" name="headFirstName" value={formState.headFirstName} onChange={onChange} required />
              </FieldRow>
              <FieldRow label="Middle name" htmlFor="hh-hmid">
                <Input id="hh-hmid" name="headMiddleName" value={formState.headMiddleName} onChange={onChange} />
              </FieldRow>
              <FieldRow label="Suffix" htmlFor="hh-hsuffix">
                <SelectField id="hh-hsuffix" name="headSuffix" value={formState.headSuffix} onChange={onChange} options={SUFFIX_OPTIONS} />
              </FieldRow>
              <FieldRow label="Date of birth" htmlFor="hh-hdob">
                <Input id="hh-hdob" name="headDateOfBirth" type="date" value={formState.headDateOfBirth} onChange={onChange} />
              </FieldRow>
              <FieldRow label="Age (computed)" htmlFor="hh-hage">
                <Input id="hh-hage" value={age} readOnly placeholder="-" tabIndex={-1} />
              </FieldRow>
              <FieldRow label="Gender" htmlFor="hh-hgender">
                <SelectField id="hh-hgender" name="headGender" value={formState.headGender} onChange={onChange} options={GENDER_OPTIONS} />
              </FieldRow>
              <FieldRow label="Civil status" htmlFor="hh-hcivil">
                <SelectField id="hh-hcivil" name="headCivilStatus" value={formState.headCivilStatus} onChange={onChange} options={CIVIL_STATUS_OPTIONS} />
              </FieldRow>
              <FieldRow label="Religion" htmlFor="hh-hreligion">
                <SelectField
                  id="hh-hreligion"
                  name="headReligion"
                  value={formState.headReligion}
                  onChange={onChange}
                  options={RELIGION_OPTIONS}
                />
              </FieldRow>
              <FieldRow label="Contact number" htmlFor="hh-hcontact">
                <Input id="hh-hcontact" name="headContactNumber" type="tel" value={formState.headContactNumber} onChange={onChange} placeholder="09XX-XXX-XXXX" />
              </FieldRow>
              <FieldRow label="Occupation" htmlFor="hh-hocc">
                <Input id="hh-hocc" name="headOccupation" value={formState.headOccupation} onChange={onChange} />
              </FieldRow>
              <FieldRow label="Monthly income (PHP)" htmlFor="hh-hincome">
                <Input id="hh-hincome" name="headMonthlyIncome" type="number" min="0" value={formState.headMonthlyIncome} onChange={onChange} />
                {formState.headMonthlyIncome !== '' && (
                  <IncomeBadge monthlyIncome={formState.headMonthlyIncome} />
                )}
              </FieldRow>
              <label className="hh-checkbox-field household-form-grid__wide" htmlFor="hh-hcurrently-studying">
                <input
                  id="hh-hcurrently-studying"
                  type="checkbox"
                  name="headCurrentlyStudying"
                  checked={Boolean(formState.headCurrentlyStudying)}
                  onChange={onChange}
                />
                <span>Currently studying?</span>
              </label>
              {formState.headCurrentlyStudying ? (
                <FieldRow label="School name" htmlFor="hh-hschool" wide>
                  <Input
                    id="hh-hschool"
                    name="headSchoolBackground"
                    value={formState.headSchoolBackground}
                    onChange={onChange}
                    placeholder="Enter school name"
                  />
                </FieldRow>
              ) : null}
            </div>
          </div>

          {/* Ã¢"â‚¬Ã¢"â‚¬ Section 3: Family members Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ */}
          <div className="household-form-section">
            <div className="household-form-section__header">
              <p className="household-form-section__label">
                Family members
                <span className="household-form-section__count">{totalMembers} total (including head)</span>
              </p>
            </div>

            {formState.familyMembers.length > 0 && (
              <div className="hh-members-list">
                {formState.familyMembers.map((member, index) => (
                  editingMemberIndex === index ? (
                    <MemberForm
                      key={member._id || `member-${index}`}
                      member={draftMember}
                      onChange={onDraftMemberChange}
                      onSave={() => onSaveMember(index)}
                      onCancel={onCancelMember}
                    />
                  ) : (
                    <MemberRow
                      key={member._id || `member-${index}`}
                      member={member}
                      onEdit={() => onEditMember(index)}
                      onRemove={() => onRemoveMember(index)}
                    />
                  )
                ))}
              </div>
            )}

            {editingMemberIndex === -1 && draftMember ? (
              <MemberForm
                member={draftMember}
                onChange={onDraftMemberChange}
                onSave={() => onSaveMember(-1)}
                onCancel={onCancelMember}
              />
            ) : (
              editingMemberIndex === null && (
                <Button type="button" variant="outline" size="sm" onClick={onAddMember} className="mt-2">
                  + Add family member
                </Button>
              )
            )}
          </div>

          {/* Ã¢"â‚¬Ã¢"â‚¬ Section 4: Lumon indicator Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ */}
          <div className="household-form-section">
            <p className="household-form-section__label">Lumon person tagging</p>
            <div className="household-form-grid gap-4">
              <label className="hh-checkbox-field" htmlFor="hh-lumon">
                <input
                  id="hh-lumon"
                  type="checkbox"
                  name="isLumon"
                  checked={formState.isLumon}
                  onChange={onChange}
                />
                <span>Tag specific person records as Lumon</span>
              </label>
              {formState.isLumon && (
                <>
                  <div className="household-form-grid__wide hh-lumon-members">
                    <p className="hh-lumon-members__label">Persons tagged as Lumon</p>
                    <p className="hh-lumon-members__hint">
                      Select the head or household member records that should carry the Lumon tag.
                    </p>
                    <div className="hh-lumon-members__list">
                      {lumonChoices.map((choice) => (
                        <label key={choice.key} className="hh-checkbox-field hh-checkbox-field--compact">
                          <input
                            type="checkbox"
                            checked={selectedLumonMembers.has(choice.key)}
                            onChange={(event) => onToggleLumonMember(choice.key, event.target.checked)}
                          />
                          <span>{choice.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {errorMessage ? <div className="auth-alert">{errorMessage}</div> : null}

          <div className="household-form-actions">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Save household'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ HouseholdProfileModal Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬

function ProfileField({ label, value }) {
  return (
    <div className="hh-profile-field">
      <span className="hh-profile-field__label">{label}</span>
      <strong className="hh-profile-field__value">{value || '—'}</strong>
    </div>
  );
}

function HouseholdProfileModal({ household, details, onClose }) {
  const h = details?.household ? { ...household, ...details.household } : household;
  const age = computeAge(h.headDateOfBirth);
  const headFullName = h.headFirstName
    ? [h.headFirstName, h.headMiddleName, h.headLastName, h.headSuffix].filter(Boolean).join(' ')
    : h.head || '-';
  const familyMembers = Array.isArray(h.familyMembers) ? h.familyMembers : [];
  const totalMembers = Number(h.totalMembers ?? (1 + familyMembers.length));
  const lumonMemberKeySet = new Set(h.lumonMemberKeys ?? []);
  const isHeadLumonMember = h.isLumon && lumonMemberKeySet.has(LUMON_HEAD_KEY);

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="records-modal__panel max-w-5xl">
        <DialogHeader className="records-modal__header">
          <div>
            <span className="section-eyebrow">Household profile</span>
            <DialogTitle>
              {h.code}
              {h.isLumon ? <span className="hh-lumon-badge">LUMON</span> : null}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">Review household profile and assistance history.</DialogDescription>
        </DialogHeader>

        {/* Header summary cards */}
        <div className="records-modal__summary records-modal__summary--triple">
          <div className="records-modal__card"><span>Barangay</span><strong>{h.barangay}</strong></div>
          <div className="records-modal__card"><span>Total members</span><strong>{totalMembers}</strong></div>
          <div className="records-modal__card"><span>Open cases</span><strong>{h.openCases || '0'}</strong></div>
          {h.isLumon && (
            <div className="records-modal__card records-modal__card--highlight">
              <span>Lumon persons</span>
              <strong>{Array.isArray(h.lumonMemberNames) && h.lumonMemberNames.length > 0 ? h.lumonMemberNames.length : 'Tagged'}</strong>
            </div>
          )}
        </div>

        {h.isLumon && h.lumonDescription && (
          <div className="application-queue-note">
            <strong>Lumon note</strong>
            <p>{h.lumonDescription}</p>
          </div>
        )}
        {h.isLumon && Array.isArray(h.lumonMemberNames) && h.lumonMemberNames.length > 0 && (
          <section className="panel panel--highlight">
            <SectionHeading eyebrow="Lumon tagging" title="Tagged person records" />
            <div className="hh-lumon-names">
              {h.lumonMemberNames.map((memberName, index) => (
                <span key={`${memberName}-${index}`} className="hh-lumon-name-pill">{memberName}</span>
              ))}
            </div>
          </section>
        )}

        {/* Head of household */}
        <section className="panel panel--highlight">
          <SectionHeading
            eyebrow="Head of household"
            title={(
              <>
                {headFullName}
                {isHeadLumonMember ? <span className="hh-lumon-badge">LUMON</span> : null}
              </>
            )}
          />
          <div className="hh-profile-grid">
            <ProfileField label="Date of birth" value={h.headDateOfBirth} />
            <ProfileField label="Age" value={age ? `${age} years old` : ''} />
            <ProfileField label="Gender" value={h.headGender} />
            <ProfileField label="Civil status" value={h.headCivilStatus} />
            <ProfileField label="Religion" value={h.headReligion} />
            <ProfileField label="Contact number" value={h.headContactNumber} />
            <ProfileField label="Occupation" value={h.headOccupation} />
            <ProfileField label="Monthly income" value={h.headMonthlyIncome ? `PHP ${Number(h.headMonthlyIncome).toLocaleString()}` : ''} />
            <div className="hh-profile-field">
              <span className="hh-profile-field__label">Income classification</span>
              <IncomeBadge monthlyIncome={h.headMonthlyIncome ?? 0} />
            </div>
            {h.isFourPsQualified ? (
              <ProfileField
                label="4Ps basis"
                value={`Qualified (${h.fourPsQualifyingChildren || 0} child${Number(h.fourPsQualifyingChildren || 0) > 1 ? 'ren' : ''}, ages 5-18)`}
              />
            ) : null}
            <ProfileField label="School / studying" value={h.headSchoolBackground} />
            <ProfileField label="Address" value={[h.purokSitio, h.addressLine1, h.barangay].filter(Boolean).join(', ')} />
          </div>
        </section>

        {/* Family members */}
        <section className="panel">
          <SectionHeading eyebrow="Composition" title={`Family members (${familyMembers.length})`} />
          {familyMembers.length > 0 ? (
            <div className="hh-profile-members-table-wrap">
              <table className="hh-profile-members-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full name</th>
                    <th>Relationship</th>
                    <th>Date of birth</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Civil status</th>
                    <th>Religion</th>
                    <th>Contact</th>
                    <th>Occupation</th>
                    <th>Monthly income</th>
                    <th>Income classification</th>
                    <th>School / studying</th>
                  </tr>
                </thead>
                <tbody>
                  {familyMembers.map((member, index) => {
                    const memberAge = computeAge(member.dateOfBirth);
                    const memberName = formatMemberName(member);
                    const isLumonMember = h.isLumon && lumonMemberKeySet.has(member._id);
                    return (
                      <tr key={member._id || index}>
                        <td className="hh-pmt__num">{index + 1}</td>
                        <td className="hh-pmt__name">
                          <strong>{memberName}</strong>
                          {isLumonMember ? <span className="hh-lumon-badge">LUMON</span> : null}
                        </td>
                        <td>{member.relationship || '—'}</td>
                        <td>{member.dateOfBirth || '—'}</td>
                        <td>{memberAge ? `${memberAge} yrs` : '—'}</td>
                        <td>{member.gender || '—'}</td>
                        <td>{member.civilStatus || '—'}</td>
                        <td>{member.religion || '—'}</td>
                        <td>{member.contactNumber || '—'}</td>
                        <td>{member.occupation || '—'}</td>
                        <td>{member.monthlyIncome ? `PHP ${Number(member.monthlyIncome).toLocaleString()}` : '—'}</td>
                        <td><IncomeBadge monthlyIncome={member.monthlyIncome ?? 0} /></td>
                        <td>{member.schoolBackground || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="records-history__empty">No family members recorded for this household.</div>
          )}
        </section>

        {/* Assistance history from details */}
        <section className="panel panel--highlight">
          <SectionHeading eyebrow="History" title="Recent assistance history" />
          <div className="records-history">
            {details.history.length > 0 ? (
              details.history.map((item, index) => (
                <article key={`${item.date}-${index}`} className="records-history__item">
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

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ HouseholdActions Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬

function HouseholdActions({ item, onViewProfile, onEdit, onDelete }) {
  const [popoverPos, setPopoverPos] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const menuId = `hh-actions-${String(item?.code ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
  const isOpen = popoverPos !== null;

  const openMenu = (event) => {
    event.stopPropagation();
    if (isOpen) {
      setPopoverPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const close = (event) => {
      if (
        popoverRef.current && !popoverRef.current.contains(event.target) &&
        triggerRef.current && !triggerRef.current.contains(event.target)
      ) {
        setPopoverPos(null);
      }
    };
    const closeKey = (event) => { if (event.key === 'Escape') setPopoverPos(null); };
    const closeScroll = () => setPopoverPos(null);

    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeKey);
    window.addEventListener('scroll', closeScroll, true);
    window.addEventListener('resize', closeScroll);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeKey);
      window.removeEventListener('scroll', closeScroll, true);
      window.removeEventListener('resize', closeScroll);
    };
  }, [isOpen]);

  const runAction = (handler) => (event) => {
    event.stopPropagation();
    setPopoverPos(null);
    if (handler) handler();
  };

  return (
    <div className="hh-row-actions hh-row-actions--menu" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="hh-action-trigger"
        aria-label="Open actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={openMenu}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          ref={popoverRef}
          id={menuId}
          className="hh-actions-popover"
          role="menu"
          aria-label="Household actions"
          style={{ position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999 }}
        >
          <button type="button" className="hh-actions-popover__item" role="menuitem" onClick={runAction(onViewProfile)}>
            View profile
          </button>
          {onEdit ? (
            <button type="button" className="hh-actions-popover__item" role="menuitem" onClick={runAction(onEdit)}>
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="hh-actions-popover__item hh-actions-popover__item--danger"
              role="menuitem"
              onClick={runAction(onDelete)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬ HouseholdsPage Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬

function HouseholdsPage({ session }) {
  const [households, setHouseholds] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [householdForm, setHouseholdForm] = useState(EMPTY_FORM);
  const [profileHousehold, setProfileHousehold] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const [isLocatingGeo, setIsLocatingGeo] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Member editing state
  const [editingMemberIndex, setEditingMemberIndex] = useState(null); // null = closed, -1 = new
  const [draftMember, setDraftMember] = useState(null);

  const canManageHouseholds = canManageHouseholdsByRole(session);
  const roleKey = resolveSessionRoleKey(session);
  const isBarangayScopedRole = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  const scopedBarangayName = session?.barangayName || '';

  const dashboardFilter = getHashQueryParams(window.location.hash).get('filter');
  const dashboardRowFilter = (() => {
    if (dashboardFilter === 'tupad_priority') {
      return (row) => classifyIncome(row.headMonthlyIncome).tupadPriority;
    }
    if (dashboardFilter === 'indigent') {
      return (row) => classifyIncome(row.headMonthlyIncome).key === 'no_income';
    }
    if (dashboardFilter === 'lumon') {
      return (row) => Boolean(row.isLumon);
    }
    return null;
  })();

  useEffect(() => {
    async function init() {
      try {
        const [data, bList] = await Promise.all([
          supabaseService.getHouseholds(),
          supabaseService.getBarangays(),
        ]);
        setHouseholds(data);
        setBarangays(bList);
        if (data.length > 0) setSelectedCode(data[0].code);
      } catch (error) {
        setPageError(error.message || 'Failed to load households.');
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const resetForm = () => setHouseholdForm(EMPTY_FORM);

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === 'barangay' && isBarangayScopedRole) return;

    setHouseholdForm((current) => {
      if (name === 'barangay' && modalMode === 'add') {
        return { ...current, barangay: value, code: nextHouseholdCode(households, value, barangays) };
      }
      if (type === 'checkbox') {
        if (name === 'headCurrentlyStudying' && !checked) {
          return { ...current, headCurrentlyStudying: false, headSchoolBackground: '' };
        }
        if (name === 'isLumon' && !checked) {
          return {
            ...current,
            isLumon: false,
            lumonFamilyCount: '1',
            lumonDescription: '',
            lumonMemberKeys: [],
            lumonMemberNames: [],
          };
        }
        if (name === 'isLumon' && checked) {
          return { ...current, isLumon: true };
        }
        return { ...current, [name]: checked };
      }
      return { ...current, [name]: value };
    });
  };

  // Member handlers
  const handleAddMember = () => {
    setDraftMember(newMember());
    setEditingMemberIndex(-1);
  };

  const handleDraftMemberChange = (fieldName, value) => {
    setDraftMember((current) => {
      if (fieldName === 'currentlyStudying' && !value) {
        return { ...current, currentlyStudying: false, schoolBackground: '' };
      }
      return { ...current, [fieldName]: value };
    });
  };

  const handleSaveMember = (index) => {
    if (!draftMember) return;
    setHouseholdForm((current) => {
      const updatedMembers = [...current.familyMembers];
      const memberWithId = {
        ...draftMember,
        _id: draftMember._id || `${Date.now()}-${Math.random()}`,
      };
      if (index === -1) {
        updatedMembers.push(memberWithId);
      } else {
        updatedMembers[index] = memberWithId;
      }
      const nextForm = { ...current, familyMembers: updatedMembers };
      const choices = getLumonMemberChoices(nextForm);
      return {
        ...nextForm,
        lumonMemberKeys: sanitizeLumonMemberKeys(current.lumonMemberKeys, choices),
      };
    });
    setDraftMember(null);
    setEditingMemberIndex(null);
  };

  const handleCancelMember = () => {
    setDraftMember(null);
    setEditingMemberIndex(null);
  };

  const handleEditMember = (index) => {
    setDraftMember({ ...householdForm.familyMembers[index] });
    setEditingMemberIndex(index);
  };

  const handleRemoveMember = (index) => {
    setHouseholdForm((current) => {
      const nextForm = {
        ...current,
        familyMembers: current.familyMembers.filter((_, i) => i !== index),
      };
      const choices = getLumonMemberChoices(nextForm);
      return {
        ...nextForm,
        lumonMemberKeys: sanitizeLumonMemberKeys(current.lumonMemberKeys, choices),
      };
    });
    if (editingMemberIndex === index) {
      setDraftMember(null);
      setEditingMemberIndex(null);
    }
  };

  const handleToggleLumonMember = (memberKey, checked) => {
    setHouseholdForm((current) => {
      const choices = getLumonMemberChoices(current);
      const base = sanitizeLumonMemberKeys(current.lumonMemberKeys, choices);
      const key = String(memberKey ?? '').trim();
      const selected = new Set(base);
      if (checked) selected.add(key);
      else selected.delete(key);
      return {
        ...current,
        lumonMemberKeys: sanitizeLumonMemberKeys([...selected], choices),
      };
    });
  };

  const openAddModal = () => {
    setFormError('');
    setGeoError('');
    const defaultBarangay = isBarangayScopedRole
      ? (scopedBarangayName || barangays[0]?.name || '')
      : (barangays[0]?.name ?? '');
    setHouseholdForm({
      ...EMPTY_FORM,
      code: nextHouseholdCode(households, defaultBarangay, barangays),
      barangay: defaultBarangay,
    });
    setEditingMemberIndex(null);
    setDraftMember(null);
    setModalMode('add');
  };

  const openEditModal = (row) => {
    setFormError('');
    setGeoError('');
    const nextForm = {
      code: row.code,
      barangay: row.barangay,
      purokSitio: row.purokSitio || '',
      addressLine1: row.addressLine1 || '',
      latitude: row.latitude != null ? String(row.latitude) : '',
      longitude: row.longitude != null ? String(row.longitude) : '',
      headLastName: row.headLastName || '',
      headFirstName: row.headFirstName || '',
      headMiddleName: row.headMiddleName || '',
      headSuffix: row.headSuffix || '',
      headDateOfBirth: row.headDateOfBirth || '',
      headGender: row.headGender || '',
      headCivilStatus: row.headCivilStatus || '',
      headReligion: row.headReligion || '',
      headContactNumber: row.headContactNumber || '',
      headCurrentlyStudying: isCurrentlyStudyingFromValue(row.headSchoolBackground),
      headSchoolBackground: row.headSchoolBackground || '',
      headOccupation: row.headOccupation || '',
      headMonthlyIncome: row.headMonthlyIncome || '',
      familyMembers: Array.isArray(row.familyMembers)
        ? row.familyMembers.map((member, index) => ({
            ...member,
            _id: member._id || `${row.code}-member-${index}`,
            currentlyStudying: isCurrentlyStudyingFromValue(member.schoolBackground),
          }))
        : [],
      isLumon: row.isLumon || false,
      lumonFamilyCount: row.lumonFamilyCount || '1',
      lumonDescription: row.lumonDescription || '',
      lumonMemberKeys: Array.isArray(row.lumonMemberKeys) ? row.lumonMemberKeys : [],
      lumonMemberNames: Array.isArray(row.lumonMemberNames) ? row.lumonMemberNames : [],
    };
    const choices = getLumonMemberChoices(nextForm);
    setHouseholdForm({
      ...nextForm,
      lumonMemberKeys: sanitizeLumonMemberKeys(nextForm.lumonMemberKeys, choices),
    });
    setEditingMemberIndex(null);
    setDraftMember(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setFormError('');
    setGeoError('');
    setIsLocatingGeo(false);
    setEditingMemberIndex(null);
    setDraftMember(null);
    resetForm();
  };

  const handleUseCurrentLocation = () => {
    setGeoError('');
    if (!navigator?.geolocation) {
      setGeoError('Geolocation is not supported on this browser.');
      return;
    }

    setIsLocatingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        setHouseholdForm((current) => ({
          ...current,
          latitude: Number.isFinite(latitude) ? latitude.toFixed(6) : current.latitude,
          longitude: Number.isFinite(longitude) ? longitude.toFixed(6) : current.longitude,
        }));
        setIsLocatingGeo(false);
      },
      (error) => {
        const message = error?.code === 1
          ? 'Location permission was denied.'
          : error?.code === 2
            ? 'Current location is unavailable.'
            : 'Unable to fetch current location.';
        setGeoError(message);
        setIsLocatingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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
    const f = householdForm;
    const lumonChoices = getLumonMemberChoices(f);
    const lumonMemberKeys = f.isLumon
      ? sanitizeLumonMemberKeys(f.lumonMemberKeys, lumonChoices)
      : [];
    const lumonMemberNames = f.isLumon
      ? deriveLumonMemberNames(lumonChoices, lumonMemberKeys)
      : [];
    if (f.isLumon && lumonMemberKeys.length === 0) {
      setFormError('Select at least one person to tag as Lumon.');
      return;
    }
    const normalizedLumonFamilyCount = f.isLumon
      ? String(Math.max(1, lumonMemberKeys.length))
      : '1';

    const payload = {
      code: f.code.trim().toUpperCase(),
      head: formatHeadName(f) || f.code,
      barangay: isBarangayScopedRole ? (scopedBarangayName || f.barangay.trim()) : f.barangay.trim(),
      members: String(1 + f.familyMembers.length),
      purokSitio: f.purokSitio.trim(),
      addressLine1: f.addressLine1.trim(),
      latitude: f.latitude,
      longitude: f.longitude,
      postalCode: '',
      monthlyIncome: f.headMonthlyIncome.trim(),
      povertyLevel: '',
      // Extended fields
      headLastName: f.headLastName.trim(),
      headFirstName: f.headFirstName.trim(),
      headMiddleName: f.headMiddleName.trim(),
      headSuffix: f.headSuffix,
      headDateOfBirth: f.headDateOfBirth,
      headGender: f.headGender,
      headCivilStatus: f.headCivilStatus,
      headReligion: f.headReligion.trim(),
      headContactNumber: f.headContactNumber.trim(),
      headCurrentlyStudying: Boolean(f.headCurrentlyStudying),
      headSchoolBackground: f.headCurrentlyStudying ? f.headSchoolBackground.trim() : '',
      headOccupation: f.headOccupation.trim(),
      headMonthlyIncome: f.headMonthlyIncome.trim(),
      familyMembers: f.familyMembers.map((member) => ({
        ...member,
        currentlyStudying: Boolean(member.currentlyStudying),
        schoolBackground: member.currentlyStudying ? String(member.schoolBackground ?? '').trim() : '',
      })),
      isLumon: f.isLumon,
      lumonFamilyCount: normalizedLumonFamilyCount,
      lumonDescription: f.isLumon ? f.lumonDescription.trim() : '',
      lumonMemberKeys,
      lumonMemberNames,
    };

    setIsSubmitting(true);
    setFormError('');

    try {
      const household = modalMode === 'edit'
        ? await supabaseService.updateHousehold(payload)
        : await supabaseService.createHousehold(payload);

      // Merge extended fields back since the service may return only core fields
      const enriched = { ...payload, ...household };

      setHouseholds((current) => {
        if (modalMode === 'edit') {
          return current.map((item) => (item.code === enriched.code ? enriched : item));
        }
        return [enriched, ...current.filter((item) => item.code !== enriched.code)];
      });

      setSelectedCode(enriched.code);

      if (profileHousehold?.code === enriched.code) {
        setProfileHousehold(enriched);
        const details = await supabaseService.getHouseholdDetails(enriched.code, enriched);
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
    if (!confirmed) return;
    setPageError('');
    try {
      await supabaseService.deleteHousehold(code);
      const next = households.filter((item) => item.code !== code);
      setHouseholds(next);
      if (profileHousehold?.code === code) closeProfileModal();
      if (selectedCode === code) setSelectedCode(next[0]?.code ?? null);
    } catch (error) {
      setPageError(error.message || 'Failed to delete household.');
    }
  };

  const columns = [
    { key: 'code', label: 'Code', render: (item) => <strong>{item.code}</strong> },
    {
      key: 'head',
      label: 'Head',
      getSearchText: (item) => {
        const memberNames = Array.isArray(item.familyMembers)
          ? item.familyMembers.map((m) => formatMemberName(m)).join(' ')
          : '';
        return [item.head, memberNames].filter(Boolean).join(' ');
      },
    },
    { key: 'barangay', label: 'Barangay' },
    {
      key: 'members',
      label: 'Members',
      render: (item) => (
        <span>
          {item.members}
          {item.isLumon ? <span className="hh-lumon-badge" title="Has Lumon person tags">LUMON</span> : null}
        </span>
      ),
    },
    {
      key: 'incomeClassification',
      label: 'Income classification',
      render: (item) => {
        const label = getIncomeClassificationLabel(item.monthlyIncome, {
          isQualified: item.isFourPsQualified,
          qualifyingChildrenCount: item.fourPsQualifyingChildren,
        });
        const isPriority = classifyIncome(item.monthlyIncome).tupadPriority;
        return (
          <span className={`hh-income-classification ${isPriority ? 'hh-income-classification--priority' : ''}`}>
            {label}
          </span>
        );
      },
      getSortValue: (item) => getIncomeClassificationLabel(item.monthlyIncome, {
        isQualified: item.isFourPsQualified,
        qualifyingChildrenCount: item.fourPsQualifyingChildren,
      }),
    },
    {
      key: 'availPrograms',
      label: 'Avail programs',
      render: (item) => String(Number(item.availProgramsCount ?? 0)),
      getSortValue: (item) => Number(item.availProgramsCount ?? 0),
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => (
        <HouseholdActions
          item={item}
          onViewProfile={() => openProfileModal(item)}
          onEdit={canManageHouseholds ? () => openEditModal(item) : undefined}
          onDelete={canManageHouseholds && !isBarangayScopedRole ? () => handleDelete(item.code) : undefined}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="page-load-spinner" role="status" aria-live="polite">Loading households...</div>
      </div>
    );
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
                <Button type="button" onClick={openAddModal}>Add household</Button>
              )
            }
            initialSortKey="code"
            gridTemplate="1fr 1.35fr 1fr 0.7fr 1.6fr 1.35fr 260px"
            rowFilter={dashboardRowFilter}
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
          onAddMember={handleAddMember}
          onSaveMember={handleSaveMember}
          onCancelMember={handleCancelMember}
          onEditMember={handleEditMember}
          onRemoveMember={handleRemoveMember}
          editingMemberIndex={editingMemberIndex}
          draftMember={draftMember}
          onDraftMemberChange={handleDraftMemberChange}
          onToggleLumonMember={handleToggleLumonMember}
          onUseCurrentLocation={handleUseCurrentLocation}
          isLocatingGeo={isLocatingGeo}
          geoError={geoError}
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
