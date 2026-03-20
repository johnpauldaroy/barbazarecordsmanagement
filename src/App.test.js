import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { demoCredentials } from './auth';

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
});

test('requires sign-in before showing the admin portal and switches to the applications workspace', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /Access the workspace/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Government email/i), {
    target: { value: demoCredentials.email },
  });
  fireEvent.change(screen.getByLabelText(/^Password$/i), {
    target: { value: demoCredentials.password },
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign in to workspace/i }));

  expect(screen.getByRole('link', { name: /MSWD Portal/i })).toBeInTheDocument();
  expect(screen.getByText(/MSWD Processor/i)).toBeInTheDocument();

  window.location.hash = '#/applications';
  fireEvent(
    window,
    new HashChangeEvent('hashchange', {
      newURL: 'http://localhost/#/applications',
    })
  );

  expect(screen.getByRole('heading', { name: /^Applications$/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Assigned applications/i })).toBeInTheDocument();

  fireEvent.click(screen.getByText(/Danilo P. Serrano/i));

  expect(screen.getByRole('heading', { name: /AICS-2026-00133/i })).toBeInTheDocument();
});

test('toggles the sidebar between expanded and collapsed states', () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Ana B. Ramos',
      role: 'MSWD Processor',
    })
  );
  window.location.hash = '#/dashboard';

  render(<App />);

  const sidebarToggle = screen.getByRole('button', { name: /Collapse sidebar/i });
  expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();

  fireEvent.click(sidebarToggle);

  expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();
});

test('updates household details when a different household row is selected', () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Ana B. Ramos',
      role: 'MSWD Processor',
    })
  );
  window.location.hash = '#/households';

  render(<App />);

  fireEvent.click(screen.getByText(/Danilo P. Serrano/i));

  expect(screen.getByText(/Construction work and tricycle driving/i)).toBeInTheDocument();
  expect(screen.getByText(/Emergency household food assistance after income disruption/i)).toBeInTheDocument();
});
