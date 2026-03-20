import { useState } from 'react';
import { authenticateUser, demoCredentials } from '../auth';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(demoCredentials.email);
  const [password, setPassword] = useState(demoCredentials.password);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      const session = authenticateUser({ email, password });
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
          <span className="section-eyebrow">Municipality of Barbaza</span>
          <h1>MSWD Admin Portal</h1>
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
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
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

        <div className="auth-demo-card">
          <span>Demo access</span>
          <strong>{demoCredentials.email}</strong>
          <p>Password: {demoCredentials.password}</p>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
