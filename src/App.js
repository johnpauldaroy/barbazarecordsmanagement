import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { routes, resolveRoute } from './routes';

function App() {
  const [currentPath, setCurrentPath] = useState(() => resolveRoute(window.location.hash));

  useEffect(() => {
    const syncRoute = () => {
      setCurrentPath(resolveRoute(window.location.hash));
    };

    if (!window.location.hash) {
      window.location.hash = '#/';
    } else {
      syncRoute();
    }

    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const currentRoute = useMemo(
    () => routes.find((route) => route.path === currentPath) ?? routes[0],
    [currentPath]
  );
  const CurrentPage = currentRoute.component;

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="#/" className="site-brand">
          <span className="site-brand__eyebrow">Municipality of Barbaza</span>
          <strong>Records and Social Assistance</strong>
        </a>

        <nav className="site-nav" aria-label="Primary">
          {routes.map((route) => (
            <a
              key={route.path}
              href={`#${route.path}`}
              className={`site-nav__link ${
                route.path === currentPath ? 'site-nav__link--active' : ''
              }`}
              aria-current={route.path === currentPath ? 'page' : undefined}
            >
              {route.label}
            </a>
          ))}
        </nav>
      </header>

      <CurrentPage />
    </div>
  );
}

export default App;
