import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';
import HouseholdsPage from './pages/HouseholdsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export const routes = [
  { path: '/dashboard', label: 'Dashboard', component: DashboardPage },
  { path: '/applications', label: 'Applications', component: ApplicationsPage },
  { path: '/households', label: 'Households', component: HouseholdsPage },
  { path: '/reports', label: 'Reports', component: ReportsPage },
  { path: '/settings', label: 'Settings', component: SettingsPage },
];

export function resolveRoute(hash) {
  const path = hash.replace(/^#/, '') || '/dashboard';
  return routes.some((route) => route.path === path) || path === '/login' ? path : '/dashboard';
}
