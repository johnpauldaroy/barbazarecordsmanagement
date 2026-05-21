import { Suspense, lazy } from 'react';
import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';
import HouseholdsPage from './pages/HouseholdsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export { getHashPath, getHashQueryParams, resolveRoute } from './routeUtils';

const LandMapPage = lazy(() => import('./pages/LandMapPage'));

function LandMapRoute(props) {
  return (
    <Suspense fallback={<div className="page-load-spinner">Loading map...</div>}>
      <LandMapPage {...props} />
    </Suspense>
  );
}

export const routes = [
  { path: '/dashboard', label: 'Dashboard', component: DashboardPage },
  { path: '/applications', label: 'Applications', component: ApplicationsPage },
  { path: '/households', label: 'Households', component: HouseholdsPage },
  { path: '/land-map', label: 'Land Map', component: LandMapRoute },
  { path: '/reports', label: 'Reports', component: ReportsPage },
  { path: '/settings', label: 'Settings', component: SettingsPage },
];
