jest.mock('react-leaflet', () => ({
  MapContainer: () => null,
  TileLayer: () => null,
  CircleMarker: () => null,
  Popup: () => null,
  useMap: () => null,
}));
jest.mock('leaflet', () => ({
  icon: () => ({}),
  divIcon: () => ({}),
  DomUtil: { create: () => ({}) },
}));

import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { demoCredentials } from './auth';

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
});

test('requires sign-in and opens applications for barangay secretary', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: /^Sign in$/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^Email$/i), {
    target: { value: demoCredentials.email },
  });
  fireEvent.change(screen.getByLabelText(/^Password$/i), {
    target: { value: demoCredentials.password },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

  expect(await screen.findByText(/Barangay Secretary/i)).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /^Dashboard$/i })).toBeInTheDocument();
});

test('admin can access dashboard, households (view only), applications, land map, and settings', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: 'juan.cruz@barbaza.gov.ph',
      name: 'Juan D. Cruz',
      role: 'Admin',
      roleKey: 'admin',
    })
  );
  window.location.hash = '#/applications';

  render(<App />);

  expect(await screen.findByRole('heading', { name: /^Applications$/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Add application/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Households/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Land Map/i })).toBeInTheDocument();

  fireEvent.click(await screen.findByText(/Danilo P. Serrano/i));
  expect(await screen.findByRole('button', { name: /^Approve$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Reject$/i })).toBeInTheDocument();
});

test('barangay secretary can manage households and cannot approve applications', async () => {
  window.localStorage.setItem(
    'barbaza-mswd-session',
    JSON.stringify({
      email: 'maria.santos@barbaza.gov.ph',
      name: 'Maria L. Santos',
      role: 'Barangay Secretary',
      roleKey: 'barangay_secretary',
      barangayName: 'Mayha',
    })
  );
  window.location.hash = '#/households';

  render(<App />);

  expect(await screen.findByRole('heading', { name: /^Households$/i })).toBeInTheDocument();
  fireEvent.click((await screen.findAllByRole('button', { name: /^Open actions$/i }))[0]);
  expect(await screen.findByRole('menuitem', { name: /View profile/i })).toBeInTheDocument();
  expect(await screen.findByRole('menuitem', { name: /^Edit$/i })).toBeInTheDocument();
  expect(await screen.findByRole('menuitem', { name: /^Delete$/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Land Map/i })).toBeInTheDocument();

  window.location.hash = '#/applications';
  fireEvent(window, new HashChangeEvent('hashchange', { newURL: 'http://localhost/#/applications' }));

  fireEvent.click(await screen.findByText(/Danilo P. Serrano/i));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Reject$/i })).not.toBeInTheDocument();
});
