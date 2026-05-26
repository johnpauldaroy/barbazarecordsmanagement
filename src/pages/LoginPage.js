import { useEffect, useState } from 'react';
import { authenticateUser, demoCredentials, isSupabaseEnabled } from '../auth';

function LoginPage({ onLogin }) {
  const useDemoCredentials = process.env.NODE_ENV === 'test' && !isSupabaseEnabled;
  const heroSlides = [
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Beach%20near%20Nauhon%2C%20Antique.jpg',
      fallbackImage: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Ph_locator_antique_barbaza.png',
      eyebrow: 'Republic of the Philippines',
      title: 'Municipality of Barbaza',
      description: 'Social welfare records and assistance services for every barangay in Barbaza, Antique.',
      bullets: [
        'Application management',
        'Household registry and profiling',
        'Role-based barangay access',
      ],
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fishing%20tools%2C%20Nauhon%2C%20Sebaste.jpg',
      fallbackImage: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Ph_locator_antique_barbaza.png',
      eyebrow: 'Coastal Community',
      title: 'Barbaza Municipal Reach',
      description: 'Keep resident and household records connected to real communities across coastal and inland barangays.',
      bullets: [
        'Household profiles by barangay',
        'Social program service tracking',
        'Community-first case handling',
      ],
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bugasong%20Sea%20Shore.jpg',
      fallbackImage: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Ph_locator_antique_barbaza.png',
      eyebrow: 'Municipal Mapping',
      title: 'Map-Linked Household Registry',
      description: 'Pin household locations and monitor program coverage to support planning and field coordination.',
      bullets: [
        'Open in map from household setup',
        'Coordinate-aware validation',
        'Better targeting for outreach',
      ],
    },
  ];

  const [email, setEmail] = useState(useDemoCredentials ? demoCredentials.email : '');
  const [password, setPassword] = useState(useDemoCredentials ? demoCredentials.password : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [failedSlides, setFailedSlides] = useState({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

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
      <div className="auth-hero" aria-label="Municipality of Barbaza highlights">
        <div className="auth-hero-carousel">
          {heroSlides.map((slide, index) => {
            const isActive = index === activeSlide;
            const imageSource = failedSlides[index]
              ? (slide.fallbackImage ?? 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Ph_locator_antique_barbaza.png')
              : slide.image;

            return (
              <article
                key={`${slide.title}-${index}`}
                className={`auth-hero-slide ${isActive ? 'auth-hero-slide--active' : ''}`}
                aria-hidden={!isActive}
              >
                <img
                  src={imageSource}
                  alt={isActive ? slide.title : ''}
                  className="auth-hero-slide__image"
                  onError={() => setFailedSlides((current) => ({ ...current, [index]: true }))}
                />
                <div className="auth-hero-slide__overlay" />
                <div className="auth-hero__inner">
                  <img
                    src={`${process.env.PUBLIC_URL}/barbaza-seal.png`}
                    alt=""
                    className="auth-hero__seal"
                  />
                  <div className="auth-hero__copy">
                    <span className="section-eyebrow">{slide.eyebrow}</span>
                    <h1>{slide.title}</h1>
                    <p>{slide.description}</p>
                  </div>
                  <ul className="auth-hero__bullets">
                    {slide.bullets.map((bullet) => (
                      <li key={bullet}><span className="auth-hero__bullet-dot" />{bullet}</li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
        <div className="auth-hero-carousel__dots" role="tablist" aria-label="Hero slides">
          {heroSlides.map((slide, index) => (
            <button
              key={`dot-${slide.title}`}
              type="button"
              role="tab"
              className={`auth-hero-carousel__dot ${index === activeSlide ? 'auth-hero-carousel__dot--active' : ''}`}
              aria-selected={index === activeSlide}
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setActiveSlide(index)}
            />
          ))}
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
