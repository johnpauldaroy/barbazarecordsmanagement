import PageBanner from '../components/PageBanner';
import SectionHeading from '../components/SectionHeading';
import {
  architectureLayers,
  implementationSteps,
  phasePlan,
  routeGroups,
  tableGroups,
} from '../systemData';

function BlueprintPage() {
  return (
    <main className="main-layout">
      <PageBanner
        eyebrow="Implementation Blueprint"
        title="The uploaded prompt points to a Vite, TypeScript, Tailwind, and Supabase production stack."
        description="This repository is still on Create React App, so this shell remains a placeholder while the blueprint maps the required migration path."
        primaryAction={{ href: '#/', label: 'Back to home' }}
        secondaryAction={{ href: '#/analytics', label: 'View analytics page' }}
      />

      <div className="workspace-grid">
        <section className="panel">
          <SectionHeading
            eyebrow="Target Architecture"
            title="System layers expected in production"
            description="The current shell stays presentation-focused, while the blueprint defines the backend, access, and automation layers."
          />
          <div className="architecture-grid">
            {architectureLayers.map((layer) => (
              <article key={layer.title} className="architecture-card">
                <h3>{layer.title}</h3>
                <p>{layer.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel panel--split">
          <div>
            <SectionHeading
              eyebrow="Route Plan"
              title="Primary navigation and user journeys"
              description="These route groups are the initial page map for public users, residents, staff, and administrators."
            />
            <div className="route-groups">
              {routeGroups.map((group) => (
                <article key={group.title} className="route-card">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.routes.map((route) => (
                      <li key={route}>{route}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="Schema Scope"
              title="Core tables for records, applications, and auditability"
              description="The production schema should keep the household master record at the center of approvals and analytics."
            />
            <div className="route-groups">
              {tableGroups.map((group) => (
                <article key={group.title} className="route-card">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.tables.map((table) => (
                      <li key={table}>{table}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel panel--split">
          <div>
            <SectionHeading
              eyebrow="Roadmap"
              title="Implementation phases"
              description="The build is split so the team can land core records management before program-specific approvals and analytics hardening."
            />
            <div className="timeline">
              {phasePlan.map((phase, index) => (
                <article key={phase.title} className="timeline-step">
                  <span className="timeline-index">0{index + 1}</span>
                  <div>
                    <h3>{phase.title}</h3>
                    <p>{phase.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="Immediate Build Order"
              title="Recommended next implementation steps"
              description="These are the concrete steps to move this placeholder UI toward the target architecture."
            />
            <div className="checklist">
              {implementationSteps.map((step) => (
                <article key={step} className="checklist-item">
                  <span />
                  <p>{step}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BlueprintPage;
