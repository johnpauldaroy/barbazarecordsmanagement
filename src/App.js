import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import './App.css';
import './shadcn-professional.css';
import { LogOut, Menu, X } from 'lucide-react';
import { clearStoredSession, getStoredSession, subscribeToAuthChanges } from './auth';
import LoginPage from './pages/LoginPage';
import { routes, resolveRoute } from './routes';
import { portalSections } from './systemData';
import {
  canAccessPath,
  getAccessibleSections,
  getDefaultPathForRole,
} from './roleAccess';
import { supabaseService } from './supabaseService';

const sectionIcons = {
  dashboard: (
    <path d="M4.75 4.75h5.5v5.5h-5.5zm9 0h5.5v8.5h-5.5zm-9 9h5.5v5.5h-5.5zm9 0h5.5v5.5h-5.5z" />
  ),
  applications: (
    <path d="M7.25 5.75h9.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Zm2.5-2h4.5m-7 6h9.5m-9.5 3.5h6.5" />
  ),
  households: (
    <path d="m4.75 10 7.25-5.5L19.25 10v7a1 1 0 0 1-1 1h-3.5v-4.5h-5.5V18h-3.5a1 1 0 0 1-1-1z" />
  ),
  land_map: (
    <path d="M4.75 6.25 10 4.5l4 1.75 5.25-1.75v13L14 19.25l-4-1.75-5.25 1.75zM10 4.5v13m4-11.25v13" />
  ),
  reports: (
    <path d="M6.25 5.25h8.5l3 3v9.5a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1Zm2 7.5h7.5m-7.5-3h4.5m3-1.5v2h2" />
  ),
  settings: (
    <path d="M12 7.25a4.75 4.75 0 1 1 0 9.5 4.75 4.75 0 0 1 0-9.5Zm0-3.5 1.05 1.86 2.12.3.92 1.93 1.96.66v2l-1.96.66-.92 1.93-2.12.3L12 18.25l-1.05-1.86-2.12-.3-.92-1.93-1.96-.66v-2l1.96-.66.92-1.93 2.12-.3z" />
  ),
};

function NavIcon({ icon }) {
  return (
    <span className="portal-nav__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        {icon}
      </svg>
    </span>
  );
}

function MenuToggleIcon({ collapsed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="2.5" />
      <path d="M9.5 5.75v12.5" />
      <path d={collapsed ? 'm14.75 9.25 2.75 2.5-2.75 2.5' : 'm14.25 9.25-2.75 2.5 2.75 2.5'} />
    </svg>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => resolveRoute(window.location.hash));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sessionInitials = session?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const storedSession = await getStoredSession();

        if (isMounted) {
          setSession(storedSession);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    loadSession();

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useLayoutEffect(() => {
    supabaseService.setSessionContext(session);
  }, [session]);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    const syncRoute = () => {
      setCurrentPath(resolveRoute(window.location.hash));
      setMobileNavOpen(false);
    };

    if (!window.location.hash) {
      window.location.hash = session ? '#/applications' : '#/login';
    } else {
      syncRoute();
    }

    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, [authReady, session]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!session && currentPath !== '/login') {
      window.location.hash = '#/login';
      return;
    }

    if (session) {
      const defaultPath = getDefaultPathForRole(session, portalSections);

      if (currentPath === '/login') {
        window.location.hash = `#${defaultPath}`;
        return;
      }

      if (!canAccessPath(session, currentPath, portalSections)) {
        window.location.hash = `#${defaultPath}`;
      }
    }
  }, [authReady, currentPath, session]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (session) {
      html.classList.add('portal-scroll-lock');
      body.classList.add('portal-scroll-lock');
    } else {
      html.classList.remove('portal-scroll-lock');
      body.classList.remove('portal-scroll-lock');
    }

    return () => {
      html.classList.remove('portal-scroll-lock');
      body.classList.remove('portal-scroll-lock');
    };
  }, [session]);

  const currentRoute = useMemo(
    () => {
      const resolvedPath = session && canAccessPath(session, currentPath, portalSections)
        ? currentPath
        : getDefaultPathForRole(session, portalSections);
      return routes.find((route) => route.path === resolvedPath) ?? routes[0];
    },
    [currentPath, session]
  );
  const visibleSections = useMemo(
    () => getAccessibleSections(session, portalSections),
    [session]
  );

  const handleLogin = (nextSession) => {
    setSession(nextSession);
    window.location.hash = `#${getDefaultPathForRole(nextSession, portalSections)}`;
  };

  const handleSignOut = async () => {
    await clearStoredSession();
    setSession(null);
    window.location.hash = '#/login';
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => !current);
  };

  if (!authReady) {
    return (
      <div className="auth-shell">
        <section className="auth-card auth-card--loading" aria-label="Loading session">
          <div className="auth-form__header">
            <div className="page-load-spinner" role="status" aria-live="polite">
              Checking your session…
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const CurrentPage = currentRoute.component;

  return (
    <div
      className={`portal-shell ${sidebarCollapsed ? 'portal-shell--sidebar-collapsed' : ''}`}
    >
      <header className="portal-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-hamburger"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <a href="#/applications" className="portal-topbar__brand" aria-label="MSWD Portal">
            <img
              src={`${process.env.PUBLIC_URL}/barbaza-seal.png`}
              alt=""
              className="portal-topbar__seal"
            />
            <span>
              <strong>MSWD PORTAL</strong>
              <small>Barbaza Records Management System</small>
            </span>
          </a>
        </div>

        <div className="topbar-actions" aria-label="Workspace actions">
          <div className="topbar-session">
            <div className="topbar-user">
              <span className="topbar-user__avatar" aria-hidden="true">
                {sessionInitials}
              </span>
              <div className="topbar-user__details">
                <strong>{session.name}</strong>
                <small>{session.role}</small>
              </div>
            </div>
            <button type="button" className="topbar-signout" onClick={handleSignOut} title="Sign out">
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {mobileNavOpen ? (
        <div
          className="portal-sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside className={`portal-sidebar ${sidebarCollapsed ? 'portal-sidebar--collapsed' : ''} ${mobileNavOpen ? 'portal-sidebar--mobile-open' : ''}`}>
        <div className="portal-sidebar__header">
          <div className="portal-brand" aria-hidden="true">
            <span className="portal-brand__text">
              <strong>MSWD PORTAL</strong>
            </span>
          </div>

          <button
            type="button"
            className="portal-sidebar__toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={sidebarCollapsed}
          >
            <MenuToggleIcon collapsed={sidebarCollapsed} />
          </button>
        </div>

        <nav className="portal-nav" aria-label="Portal sections">
          {visibleSections
            .map((section) => (
              <a
                key={section.path}
                href={`#${section.path}`}
                className={`portal-nav__link ${
                  section.path === currentPath ? 'portal-nav__link--active' : ''
                }`}
                aria-current={section.path === currentPath ? 'page' : undefined}
                title={section.label}
              >
                <NavIcon icon={sectionIcons[section.id]} />
                <span className="portal-nav__content">
                  <span className="portal-nav__label">{section.label}</span>
                </span>
              </a>
            ))}
        </nav>
      </aside>

      <main className="portal-main">
        <div className="portal-page-header">
          <div>
            <span className="section-eyebrow">MSWD Portal</span>
            <h1>{currentRoute.label}</h1>
          </div>
        </div>

        <CurrentPage session={session} />
      </main>
    </div>
  );
}

export default App;
