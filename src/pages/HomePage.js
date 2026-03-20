import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import { businessRules, roles, workspaces } from '../systemData';

function HomePage() {
  return (
    <main className="main-layout">
      <header className="hero">
        <div className="hero__content">
          <span className="eyebrow">Municipality of Barbaza - Records and Social Assistance</span>
          <h1>Barbaza Records Management System with Data Analytics</h1>
          <p>
            A municipal operations shell centered on households, assistance applications,
            duplicate prevention, and barangay-level service visibility.
          </p>
          <div className="hero__actions">
            <a href="#/public">Explore public portal</a>
            <a href="#/blueprint" className="hero__secondary">
              View implementation blueprint
            </a>
          </div>
        </div>

        <aside className="hero__sidebar">
          <div className="hero-card">
            <span>Core mission</span>
            <strong>Fair, traceable assistance distribution</strong>
            <p>One household record informs all approvals, reports, and analytics.</p>
          </div>
          <div className="hero-card">
            <span>Required controls</span>
            <strong>RLS, audit logs, and program-specific requirements</strong>
            <p>Security and data governance are part of the product baseline, not post-launch work.</p>
          </div>
        </aside>
      </header>

      <section className="overview-strip">
        <div className="overview-strip__intro">
          <span className="section-eyebrow">Delivery Lens</span>
          <h2>System priorities from the uploaded master prompt</h2>
        </div>
        <div className="stats-grid">
          {roles.map((role) => (
            <StatCard
              key={role.name}
              label={role.name}
              value={role.focus}
              trend={role.scope}
              tone="accent"
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeading
          eyebrow="System Pages"
          title="Navigate the product page by page."
          description="Each major workspace now has its own page file and route, so the UI no longer depends on one oversized App component."
        />
        <div className="module-grid">
          {workspaces
            .filter((workspace) => workspace.path !== '/')
            .map((workspace) => (
              <a key={workspace.id} href={`#${workspace.path}`} className="nav-card">
                <span>{workspace.label}</span>
                <strong>{workspace.tagline}</strong>
                <p>{workspace.summary}</p>
              </a>
            ))}
        </div>
      </section>

      <section className="panel panel--split">
        <div>
          <SectionHeading
            eyebrow="Non-Negotiable Rules"
            title="Business rules embedded into the operating model"
            description="These checks should live in the service and policy layer once Supabase is wired in."
          />
          <div className="checklist">
            {businessRules.map((rule) => (
              <article key={rule} className="checklist-item">
                <span />
                <p>{rule}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="Blueprint Reference"
            title="Implementation plan captured in repository"
            description="The detailed product and architecture brief remains the baseline for the next build steps."
          />
          <div className="record-stack">
            <article className="record-card">
              <span>Blueprint file</span>
              <strong>docs/implementation-blueprint.md</strong>
              <small>Architecture, modules, schema scope, route plan, and roadmap.</small>
            </article>
            <article className="record-card">
              <span>Current repo state</span>
              <strong>Create React App shell</strong>
              <small>Still needs migration to Vite, TypeScript, Tailwind, and Supabase integration.</small>
            </article>
            <article className="record-card">
              <span>Immediate objective</span>
              <strong>Lock product shape before backend wiring</strong>
              <small>These pages now provide a cleaner base for the next implementation pass.</small>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
