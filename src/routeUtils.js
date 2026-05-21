const APP_ROUTE_PATHS = [
  '/dashboard',
  '/applications',
  '/households',
  '/land-map',
  '/reports',
  '/settings',
];

export function getHashPath(hash = '') {
  const normalized = String(hash ?? '').replace(/^#/, '') || '/applications';
  const [pathOnly] = normalized.split('?');
  return pathOnly || '/applications';
}

export function getHashQueryParams(hash = '') {
  const normalized = String(hash ?? '').replace(/^#/, '');
  const [, queryString = ''] = normalized.split('?');
  return new URLSearchParams(queryString);
}

export function resolveRoute(hash) {
  const path = getHashPath(hash);
  return APP_ROUTE_PATHS.includes(path) || path === '/login' ? path : '/applications';
}
