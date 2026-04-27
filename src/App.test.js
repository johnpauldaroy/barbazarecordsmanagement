import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { demoCredentials } from './auth';

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
});

test('requires sign-in before showing the admin portal and switches to the applications workspace', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: /Access the workspace/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Government email/i), {
    target: { value: demoCredentials.email },
  });
  fireEvent.change(screen.getByLabelText(/^Password$/i), {
    target: { value: demoCredentials.password },
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign in to workspace/i }));

  expect(await screen.findByRole('link', { name: /MSWD Portal/i })).toBeInTheDocument();
  expect(await screen.findByText(/MSWD Processor/i)).toBeInTheDocument();

  window.location.hash = '#/applications';
  fireEvent(
    window,
    new HashChangeEvent('hashchange', {
      newURL: 'http://localhost/#/applications',
    })
  );

  expect(await screen.findByRole('heading', { name: /^Applications$/i })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /Assigned applications/i })).toBeInTheDocument();

  fireEvent.click(screen.getByText(/Danilo P. Serrano/i));

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(await screen.findByText(/AICS-2026-00133/i)).toBeInTheDocument();
});

test('adds a new application from the applications page', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Ana B. Ramos',
      role: 'MSWD Processor',
    })
  );
  window.location.hash = '#/applications';

  render(<App />);

  const addApplicationButton = await screen.findByRole('button', { name: /Add application/i });
  await waitFor(() => expect(addApplicationButton).toBeEnabled());
  fireEvent.click(addApplicationButton);

  fireEvent.change(screen.getByLabelText(/Applicant name/i), {
    target: { value: 'Nelia P. Soriano' },
  });
  fireEvent.change(screen.getByLabelText(/Household code/i), {
    target: { value: 'HH-BAG-0009' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: /^Barangay$/i }), {
    target: { value: 'Baghari' },
  });
  fireEvent.change(screen.getByLabelText(/Intake note/i), {
    target: { value: 'Emergency food and medical intake recorded during walk-in screening.' },
  });
  fireEvent.change(screen.getByLabelText(/Upload file for Valid Government ID/i), {
    target: {
      files: [new File(['demo id'], 'valid-government-id.pdf', { type: 'application/pdf' })],
    },
  });

  fireEvent.click(screen.getByRole('button', { name: /^Add application$/i }));

  expect((await screen.findAllByText(/Nelia P. Soriano/i)).length).toBeGreaterThan(0);
  expect((await screen.findAllByText(/AICS-2026-00134/i)).length).toBeGreaterThan(0);
  expect(screen.getByText(/1 required document\(s\) still missing\./i)).toBeInTheDocument();
  expect(screen.getByText(/valid-government-id\.pdf/i)).toBeInTheDocument();
});

test('approves an application from the details workflow', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: 'juan.cruz@barbaza.gov.ph',
      name: 'Juan D. Cruz',
      role: 'super_admin',
      roleKey: 'super_admin',
    })
  );
  window.location.hash = '#/applications';

  render(<App />);

  fireEvent.click(await screen.findByText(/Danilo P. Serrano/i));
  expect(await screen.findByRole('heading', { name: /Next action/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Start review$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Mark verified$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Request info$/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Reject$/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Decision remarks/i), {
    target: { value: 'Documents checked and assistance is approved for processing.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));

  expect(await screen.findByText(/Status changed to Approved/i)).toBeInTheDocument();
  expect((await screen.findAllByText(/^Approved$/i)).length).toBeGreaterThan(0);
});

test('hides final approval actions from non-admin reviewers', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Ana B. Ramos',
      role: 'MSWD Processor',
      roleKey: 'mswdo_staff',
    })
  );
  window.location.hash = '#/applications';

  render(<App />);

  fireEvent.click(await screen.findByText(/Danilo P. Serrano/i));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Next action/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Reject$/i })).not.toBeInTheDocument();
  expect((await screen.findAllByRole('link', { name: /^View file$/i })).length).toBeGreaterThan(0);
});

test('hides uploaded document links from barangay users', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: 'maria.santos@barbaza.gov.ph',
      name: 'Maria L. Santos',
      role: 'barangay_secretary',
      roleKey: 'barangay_secretary',
      barangayName: 'Mayha',
    })
  );
  window.location.hash = '#/applications';

  render(<App />);

  fireEvent.click(await screen.findByText(/Danilo P. Serrano/i));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^View file$/i })).not.toBeInTheDocument();
});

test('toggles the sidebar between expanded and collapsed states', async () => {
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

  const sidebarToggle = await screen.findByRole('button', { name: /Collapse sidebar/i });
  expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();

  fireEvent.click(sidebarToggle);

  expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();
});

test('shows household action buttons in the registry table', async () => {
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

  expect((await screen.findAllByRole('button', { name: /View profile/i })).length).toBeGreaterThan(0);
  expect((await screen.findAllByRole('button', { name: /^Edit$/i })).length).toBeGreaterThan(0);
  expect((await screen.findAllByRole('button', { name: /^Delete$/i })).length).toBeGreaterThan(0);
});

test('shows the create user action on the settings page', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Juan D. Cruz',
      role: 'super_admin',
    })
  );
  window.location.hash = '#/settings';

  render(<App />);

  fireEvent.click(await screen.findByRole('button', { name: /Create user/i }));

  expect(await screen.findByLabelText(/Email address/i)).toBeInTheDocument();
});

test('switches between the users and programs tabs on the settings page', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Juan D. Cruz',
      role: 'super_admin',
    })
  );
  window.location.hash = '#/settings';

  render(<App />);

  expect(await screen.findByRole('tabpanel', { name: /Users/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Create user/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Programs/i })).toBeInTheDocument();
});

test('redirects non-admin accounts away from settings', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Ana B. Ramos',
      role: 'MSWD Processor',
    })
  );
  window.location.hash = '#/settings';

  render(<App />);

  expect(await screen.findByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Portal users/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Create user/i })).not.toBeInTheDocument();
});

test('shows reports navigation for barangay secretary role', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: 'maria.santos@barbaza.gov.ph',
      name: 'Maria L. Santos',
      role: 'barangay_secretary',
    })
  );
  window.location.hash = '#/dashboard';

  render(<App />);

  expect(await screen.findByRole('link', { name: /Reports/i })).toBeInTheDocument();
});

test('renders dashboard KPI links with SLA metrics and analytics summary', async () => {
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

  expect(await screen.findByRole('heading', { name: /Queue snapshot/i })).toBeInTheDocument();
  expect(await screen.findByText(/SLA breaches \(48h\+\)/i)).toBeInTheDocument();
  expect(await screen.findByText(/SLA compliance trend/i)).toBeInTheDocument();

  expect(screen.getByRole('link', { name: /Pending review details/i })).toHaveAttribute(
    'href',
    '#/applications?filter=pending_review'
  );
  expect(screen.getByRole('link', { name: /Ready for approval details/i })).toHaveAttribute(
    'href',
    '#/applications?filter=ready_for_approval'
  );
  expect(screen.getByRole('link', { name: /SLA breaches \(48h\+\) details/i })).toHaveAttribute(
    'href',
    '#/applications?filter=sla_breach'
  );
});

test('applies known applications filter intent from dashboard hash query', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: demoCredentials.email,
      name: 'Ana B. Ramos',
      role: 'MSWD Processor',
    })
  );
  window.location.hash = '#/applications?filter=ready_for_approval';

  render(<App />);

  expect(await screen.findByRole('heading', { name: /Assigned applications/i })).toBeInTheDocument();
  expect(await screen.findByText(/Showing queue items for: Ready for approval/i)).toBeInTheDocument();
  expect(await screen.findByText(/Ready for release/i)).toBeInTheDocument();
  expect(screen.queryByText(/Duplicate flagged/i)).not.toBeInTheDocument();
});

test('locks barangay selection for barangay staff and shows scoped view messaging', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: 'maria.santos@barbaza.gov.ph',
      name: 'Maria L. Santos',
      role: 'barangay_secretary',
      roleKey: 'barangay_secretary',
      barangayName: 'Mayha',
    })
  );
  window.location.hash = '#/applications';

  render(<App />);

  expect(await screen.findByText(/Showing records for Mayha only/i)).toBeInTheDocument();

  const addButton = await screen.findByRole('button', { name: /Add application/i });
  fireEvent.click(addButton);

  const dialog = await screen.findByRole('dialog');
  const barangaySelect = dialog.querySelector('select[name="barangay"]');
  expect(barangaySelect).not.toBeNull();
  expect(barangaySelect).toBeDisabled();
  expect(barangaySelect.value).toBe('Mayha');
});
