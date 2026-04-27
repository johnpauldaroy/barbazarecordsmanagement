import {
  canAccessSection,
  canApproveApplications,
  canManageHouseholds,
  canManagePortalUsers,
  canViewUploadedDocuments,
  getDefaultPathForRole,
  resolveSessionRoleKey,
} from './roleAccess';
import { portalSections } from './systemData';

test('normalizes role labels and aliases', () => {
  expect(resolveSessionRoleKey({ role: 'MSWD Processor' })).toBe('mswdo_staff');
  expect(resolveSessionRoleKey({ role: 'Super Admin' })).toBe('super_admin');
  expect(resolveSessionRoleKey({ roleKey: 'admin' })).toBe('super_admin');
  expect(resolveSessionRoleKey({ roleKey: 'staff' })).toBe('mswdo_staff');
  expect(resolveSessionRoleKey({ role: 'Barangay Staff' })).toBe('barangay_secretary');
  expect(resolveSessionRoleKey({ roleKey: 'barangay' })).toBe('barangay_secretary');
});

test('limits settings section to super admins', () => {
  expect(canAccessSection({ roleKey: 'super_admin' }, 'settings')).toBe(true);
  expect(canAccessSection({ roleKey: 'mswdo_staff' }, 'settings')).toBe(false);
  expect(canAccessSection({ roleKey: 'barangay_secretary' }, 'settings')).toBe(false);
});

test('assigns default path based on role access', () => {
  expect(getDefaultPathForRole({ roleKey: 'resident' }, portalSections)).toBe('/applications');
  expect(getDefaultPathForRole({ roleKey: 'super_admin' }, portalSections)).toBe('/dashboard');
});

test('enforces management privileges by role', () => {
  expect(canManagePortalUsers({ roleKey: 'super_admin' })).toBe(true);
  expect(canManagePortalUsers({ roleKey: 'mswdo_staff' })).toBe(false);

  expect(canManageHouseholds({ roleKey: 'mswdo_staff' })).toBe(true);
  expect(canManageHouseholds({ roleKey: 'barangay_secretary' })).toBe(true);
  expect(canManageHouseholds({ roleKey: 'mswdo_approver' })).toBe(false);
});

test('limits approval decisions to admins', () => {
  expect(canApproveApplications({ roleKey: 'super_admin' })).toBe(true);
  expect(canApproveApplications({ roleKey: 'admin' })).toBe(true);
  expect(canApproveApplications({ roleKey: 'mswdo_staff' })).toBe(false);
  expect(canApproveApplications({ roleKey: 'mswdo_approver' })).toBe(false);
  expect(canApproveApplications({ roleKey: 'barangay_secretary' })).toBe(false);
});

test('allows only admins and staff to view uploaded documents', () => {
  expect(canViewUploadedDocuments({ roleKey: 'super_admin' })).toBe(true);
  expect(canViewUploadedDocuments({ roleKey: 'admin' })).toBe(true);
  expect(canViewUploadedDocuments({ roleKey: 'mswdo_staff' })).toBe(true);
  expect(canViewUploadedDocuments({ roleKey: 'staff' })).toBe(true);
  expect(canViewUploadedDocuments({ roleKey: 'mswdo_approver' })).toBe(false);
  expect(canViewUploadedDocuments({ roleKey: 'barangay_secretary' })).toBe(false);
  expect(canViewUploadedDocuments({ roleKey: 'resident' })).toBe(false);
});
