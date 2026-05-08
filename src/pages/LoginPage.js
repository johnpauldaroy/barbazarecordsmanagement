import { useState } from 'react';
import { authenticateUser, demoCredentials, isSupabaseEnabled } from '../auth';

function LoginPage({ onLogin }) {
  const useDemoCredentials = process.env.NODE_ENV === 'test' && !isSupabaseEnabled;
  const [email, setEmail] = useState(useDemoCredentials ? demoCredentials.email : '');
  const [password, setPassword] = useState(useDemoCredentials ? demoCredentials.password : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const session = await authenticateUser({ email, password });
      setError('');
      onLogin(session);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left branding hero */}
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-hero__inner">
          <img
            src={`${process.env.PUBLIC_URL}/barbaza-seal.png`}
            alt=""
            className="auth-hero__seal"
          />
          <div className="auth-hero__copy">
            <span className="section-eyebrow">Republic of the Philippines</span>
            <h1>Municipality of Barbaza</h1>
            <p>
              Centralized records management for social welfare programs and
              community assistance services across all barangays.
            </p>
          </div>
          <ul className="auth-hero__bullets">
            <li><span className="auth-hero__bullet-dot" />Application queue management</li>
            <li><span className="auth-hero__bullet-dot" />Household registry &amp; profiling</li>
            <li><span className="auth-hero__bullet-dot" />Program eligibility tracking</li>
            <li><span className="auth-hero__bullet-dot" />Role-based barangay access</li>
          </ul>
        </div>
      </div>

      {/* Right minimalist form panel */}
      <div className="auth-panel">
        <section className="auth-card auth-card--minimal" aria-label="Login form">

          {/* Compact brand mark */}
          <div className="auth-mark">
            <img
              src={`${process.env.PUBLIC_URL}/barbaza-seal.png`}
              alt="Municipality of Barbaza seal"
              className="auth-mark__seal"
            />
            <span className="auth-mark__name">MSWD Portal</span>
          </div>

          <div className="auth-form__header">
            <h2>Sign in</h2>
            <p>Use your government email to access the workspace.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field" htmlFor="email">
              <span>Email</span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@barbaza.gov.ph"
                required
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
                  required
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

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
