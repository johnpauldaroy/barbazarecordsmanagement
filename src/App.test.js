import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the system heading and page navigation', () => {
  render(<App />);

  expect(
    screen.getByText(/Barbaza Records Management System with Data Analytics/i)
  ).toBeInTheDocument();

  window.location.hash = '#/analytics';
  fireEvent(
    window,
    new HashChangeEvent('hashchange', {
      newURL: 'http://localhost/#/analytics',
    })
  );

  expect(screen.getByText(/Beneficiaries by Barangay/i)).toBeInTheDocument();
});
