import PageBanner from '../components/PageBanner';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import { dashboardCards, householdRecords, queueItems } from '../systemData';

function ResidentPortalPage() {
  return (
    <main className="main-layout">
      <PageBanner
        eyebrow="Resident Dashboard"
        title="Application tracking, household linkage, and document submission."
        description="Each resident account is anchored to a household profile so approvals and duplicate checks can be evaluated at family level."
        primaryAction={{ href: '#/staff', label: 'Open staff workspace' }}
        secondaryAction={{ href: '#/public', label: 'Back to public portal' }}
      />

      <div className="workspace-grid">
        <section className="panel">
          <SectionHeading
            eyebrow="Resident Dashboard"
            title="Status and action items stay visible"
            description="Applicants can see account state, pending uploads, and the latest review notes without calling the municipal office."
          />
          <div className="stats-grid stats-grid--compact">
            {dashboardCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        <section className="panel panel--split">
          <div>
            <SectionHeading
              eyebrow="Application Status"
              title="Current resident applications"
              description="Reference numbers, assigned program tracks, and the next staff action stay visible to the applicant."
            />
            <div className="data-table">
              <div className="table-row table-row--header">
                <span>Reference</span>
                <span>Program</span>
                <span>Status</span>
                <span>Updated</span>
              </div>
              {queueItems.slice(0, 3).map((item) => (
                <div key={item.reference} className="table-row resident-table-row">
                  <span>{item.reference}</span>
                  <span>{item.program}</span>
                  <span>
                    <StatusPill status={item.status} tone={item.statusTone} />
                  </span>
                  <span>{item.updatedAt}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="Household Snapshot"
              title="Linked members and vulnerability indicators"
              description="The resident portal can display the same household record used by staff reviewers, minimizing inconsistent submissions."
            />
            <div className="record-stack">
              {householdRecords.map((record) => (
                <article key={record.label} className="record-card">
                  <span>{record.label}</span>
                  <strong>{record.value}</strong>
                  <small>{record.note}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ResidentPortalPage;
