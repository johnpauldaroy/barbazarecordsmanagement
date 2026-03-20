const SESSION_KEY = 'barbaza-mswd-session';

export const demoCredentials = {
  email: 'ana.ramos@barbaza.gov.ph',
  password: 'mswd-demo-2026',
};

const demoSession = {
  email: demoCredentials.email,
  name: 'Ana B. Ramos',
  role: 'MSWD Processor',
};

export function getStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function authenticateUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== demoCredentials.email || password !== demoCredentials.password) {
    throw new Error('Use the demo MSWD account shown on the sign-in card.');
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(demoSession));
  return demoSession;
}

export function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
