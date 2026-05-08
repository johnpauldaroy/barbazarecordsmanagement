import { getHashPath, getHashQueryParams, resolveRoute } from './routes';

test('resolveRoute supports hash query params', () => {
  expect(resolveRoute('#/applications?filter=pending_review')).toBe('/applications');
  expect(resolveRoute('#/dashboard')).toBe('/dashboard');
  expect(resolveRoute('#/land-map')).toBe('/land-map');
  expect(resolveRoute('#/unknown?filter=anything')).toBe('/applications');
});

test('getHashPath and getHashQueryParams parse hash segments safely', () => {
  expect(getHashPath('#/reports?filter=barangay_workload')).toBe('/reports');
  expect(getHashPath('')).toBe('/applications');

  const query = getHashQueryParams('#/applications?filter=ready_for_approval&source=dashboard');
  expect(query.get('filter')).toBe('ready_for_approval');
  expect(query.get('source')).toBe('dashboard');
});
