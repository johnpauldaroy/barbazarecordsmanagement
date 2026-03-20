import PageBanner from '../components/PageBanner';
import SectionHeading from '../components/SectionHeading';
import { processFlow, programCards } from '../systemData';

function PublicPortalPage() {
  return (
    <main className="main-layout">
      <PageBanner
        eyebrow="Public Service Portal"
        title="Single intake for municipal assistance, household-first by design."
        description="Residents can review program guidance, check requirements, and submit requests without traveling to the municipal office."
        primaryAction={{ href: '#/resident', label: 'Open resident portal' }}
        secondaryAction={{ href: '#/blueprint', label: 'Review route plan' }}
      />

      <div className="workspace-grid">
        <section className="panel panel--feature">
          <SectionHeading
            eyebrow="Program Access"
            title="Programs residents can understand before they apply"
            description="The public page sets expectations early so eligibility, requirements, and municipal workflows are visible upfront."
          />
          <div className="program-grid">
            {programCards.map((program) => (
              <article key={program.name} className="program-card">
                <div>
                  <span className="program-chip">{program.type}</span>
                  <h3>{program.name}</h3>
                </div>
                <p>{program.summary}</p>
                <ul>
                  {program.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionHeading
            eyebrow="Resident Flow"
            title="Assisted and self-service intake follow the same verified process."
            description="The application flow keeps identity, household, and program checks aligned before approvals are issued."
          />
          <div className="timeline">
            {processFlow.map((step, index) => (
              <article key={step.title} className="timeline-step">
                <span className="timeline-index">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default PublicPortalPage;
