import PageBanner from '../components/PageBanner';
import SectionHeading from '../components/SectionHeading';
import StatusPill from '../components/StatusPill';
import { duplicateAlerts, moduleCards, queueItems } from '../systemData';

function StaffWorkspacePage() {
  return (
    <main className="main-layout">
      <PageBanner
        eyebrow="Review Workspace"
        title="MSWDO and barangay staff get a triage-ready approval workspace."
        description="The review screen is organized around status, barangay scope, duplicate risk, and program-specific compliance."
        primaryAction={{ href: '#/analytics', label: 'Open analytics' }}
        secondaryAction={{ href: '#/resident', label: 'View resident portal' }}
      />

      <div className="workspace-grid">
        <section className="panel">
          <SectionHeading
            eyebrow="Review Queue"
            title="Cases ready for validation and approval"
            description="The queue keeps applicant identity, program selection, and barangay ownership visible in one operating view."
          />
          <div className="data-table">
            <div className="table-row table-row--header">
              <span>Reference</span>
              <span>Applicant</span>
              <span>Barangay</span>
              <span>Program</span>
              <span>Status</span>
            </div>
            {queueItems.map((item) => (
              <div key={item.reference} className="table-row">
                <span>{item.reference}</span>
                <span>{item.applicant}</span>
                <span>{item.barangay}</span>
                <span>{item.program}</span>
                <span>
                  <StatusPill status={item.status} tone={item.statusTone} />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel--split">
          <div>
            <SectionHeading
              eyebrow="Operational Modules"
              title="Modular management areas"
              description="The staff side isolates records, approvals, reporting, and configuration while preserving a shared household database."
            />
            <div className="module-grid">
              {moduleCards.map((module) => (
                <article key={module.title} className="module-card">
                  <h3>{module.title}</h3>
                  <p>{module.summary}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="Duplicate Flags"
              title="Cases that need deeper verification"
              description="Flagging is visible before approval so staff can inspect prior assistance, shared addresses, and household overlap."
            />
            <div className="alert-stack">
              {duplicateAlerts.map((alert) => (
                <article key={alert.title} className="alert-card">
                  <h3>{alert.title}</h3>
                  <p>{alert.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default StaffWorkspacePage;
