import AnalyticsPage from './pages/AnalyticsPage';
import BlueprintPage from './pages/BlueprintPage';
import HomePage from './pages/HomePage';
import PublicPortalPage from './pages/PublicPortalPage';
import ResidentPortalPage from './pages/ResidentPortalPage';
import StaffWorkspacePage from './pages/StaffWorkspacePage';

export const routes = [
  { path: '/', label: 'Home', component: HomePage },
  { path: '/public', label: 'Public Portal', component: PublicPortalPage },
  { path: '/resident', label: 'Resident Portal', component: ResidentPortalPage },
  { path: '/staff', label: 'Staff Workspace', component: StaffWorkspacePage },
  { path: '/analytics', label: 'Analytics', component: AnalyticsPage },
  { path: '/blueprint', label: 'Blueprint', component: BlueprintPage },
];

export function resolveRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';
  return routes.some((route) => route.path === path) ? path : '/';
}
