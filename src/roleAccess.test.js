import {
  canAccessSection,
  canApproveApplications,
  canCreateApplications,
  canManageHouseholds,
  canViewHouseholds,
  canViewUploadedDocuments,
  getDefaultPathForRole,
  resolveSessionRoleKey,
} from './roleAccess';
import { portalSections } from './systemData';

test('normalizes legacy roles into admin or barangay secretary', () => {
  expect(resolveSessionRoleKey({ role: 'MSWD Processor' })).toBe('admin');
  expect(resolveSessionRoleKey({ role: 'Super Admin' })).toBe('admin');
  expect(resolveSessionRoleKey({ roleKey: 'admin' })).toBe('admin');
  expect(resolveSessionRoleKey({ roleKey: 'barangay_staff' })).toBe('barangay_secretary');
  expect(resolveSessionRoleKey({ roleKey: 'mswdo_approver' })).toBe('admin');
});

test('grants admin access to dashboard, applications, households, land map, reports, and settings', () => {
  expect(canAccessSection({ roleKey: 'admin' }, 'dashboard')).toBe(true);
  expect(canAccessSection({ roleKey: 'admin' }, 'applications')).toBe(true);
  expect(canAccessSection({ roleKey: 'admin' }, 'households')).toBe(true);
  expect(canAccessSection({ roleKey: 'admin' }, 'land_map')).toBe(true);
  expect(canAccessSection({ roleKey: 'admin' }, 'settings')).toBe(true);
  expect(canAccessSection({ roleKey: 'admin' }, 'reports')).toBe(true);
});

test('grants barangay secretary access to dashboard, applications, households, reports, and land map', () => {
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'dashboard')).toBe(true);
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'applications')).toBe(true);
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'households')).toBe(true);
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'reports')).toBe(true);
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'land_map')).toBe(true);
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'settings')).toBe(false);
});

test('sets default path to dashboard for all roles', () => {
  expect(getDefaultPathForRole({ roleKey: 'admin' }, portalSections)).toBe('/dashboard');
  expect(getDefaultPathForRole({ roleKey: 'barangay_secretary' }, portalSections)).toBe('/dashboard');
});

test('enforces action permissions', () => {
  expect(canCreateApplications({ roleKey: 'barangay_secretary' })).toBe(true);
  expect(canCreateApplications({ roleKey: 'admin' })).toBe(false);

  expect(canManageHouseholds({ roleKey: 'barangay_secretary' })).toBe(true);
  expect(canManageHouseholds({ roleKey: 'admin' })).toBe(false);

  expect(canViewHouseholds({ roleKey: 'barangay_secretary' })).toBe(true);
  expect(canViewHouseholds({ roleKey: 'admin' })).toBe(true);

  expect(canApproveApplications({ roleKey: 'admin' })).toBe(true);
  expect(canApproveApplications({ roleKey: 'barangay_secretary' })).toBe(false);

  expect(canViewUploadedDocuments({ roleKey: 'admin' })).toBe(true);
  expect(canViewUploadedDocuments({ roleKey: 'barangay_secretary' })).toBe(true);
});
