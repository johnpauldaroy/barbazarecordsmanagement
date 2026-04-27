import { useState } from 'react';
import { authenticateUser, demoCredentials, isSupabaseEnabled } from '../auth';

function LoginPage({ onLogin }) {
  const useDemoCredentials = process.env.NODE_ENV === 'test' && !isSupabaseEnabled;
  const [email, setEmail] = useState(useDemoCredentials ? demoCredentials.email : '');
  const [password, setPassword] = useState(useDemoCredentials ? demoCredentials.password : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const session = await authenticateUser({ email, password });
      setError('');
      onLogin(session);
    } catch (submissionError) {
      setError(submissionError.message);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card" aria-label="Login form">
        <div className="auth-card__brand">
          <div className="auth-card__identity">
            <img
              src={`${process.env.PUBLIC_URL}/barbaza-seal.png`}
              alt="Municipality of Barbaza seal"
              className="auth-card__seal"
            />
            <div className="auth-card__title">
              <span className="section-eyebrow">Municipality of Barbaza</span>
              <h1>MSWD Admin Portal</h1>
            </div>
          </div>
        </div>

        <div className="auth-form__header">
          <h2>Access the workspace</h2>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="email">
            <span>Government email</span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="form-field" htmlFor="password">
            <span>Password</span>
            <div className="form-field__control">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.75 12s3.6-6 9.25-6 9.25 6 9.25 6-3.6 6-9.25 6-9.25-6-9.25-6Z" />
                  <circle cx="12" cy="12" r="3.25" />
                  {showPassword ? null : <path d="M4 20 20 4" />}
                </svg>
              </button>
            </div>
          </label>

          {error ? (
            <p className="auth-alert" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="auth-submit">
            Sign in to workspace
          </button>
        </form>

      </section>
    </div>
  );
}

export default LoginPage;
