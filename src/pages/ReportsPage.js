import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import { exportCards, reportStats, workloadByBarangay } from '../systemData';

function ReportsPage() {
  const maxPending = Math.max(...workloadByBarangay.map((item) => item.pending));

  return (
    <div className="workspace-page">
      <section className="panel">
        <SectionHeading eyebrow="Summary" title="Reporting highlights" />
        <div className="stats-grid">
          {reportStats.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="page-grid">
        <article className="panel">
          <SectionHeading eyebrow="Workload" title="Pending by barangay" />
          <div className="bar-list">
            {workloadByBarangay.map((item) => (
              <div key={item.barangay} className="bar-row">
                <div className="bar-row__labels">
                  <strong>{item.barangay}</strong>
                  <div className="bar-row__actions">
                    <span>{item.pending} pending</span>
                    <button
                      type="button"
                      className="row-action row-action--ghost row-action--sm"
                      title={`View ${item.barangay} cases`}
                      onClick={() => alert(`Viewing ${item.barangay} cases`)}
                    >
                      <span className="row-action__icon">→</span>
                      <span className="row-action__label">View</span>
                    </button>
                  </div>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(item.pending / maxPending) * 100}%` }}
                  />
                </div>
                <small>{item.approved} approved this month</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <SectionHeading eyebrow="Available outputs" title="Common report exports" />
          <div className="list-stack">
            {exportCards.map((item) => (
              <div key={item.title} className="list-row list-row--stacked">
                <div>
                  <span className="list-row__eyebrow">{item.metric}</span>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </div>
                <div className="report-export-actions">
                  <button
                    type="button"
                    className="row-action row-action--primary row-action--sm"
                    title="Export as CSV"
                  >
                    <span className="row-action__icon">↓</span>
                    <span className="row-action__label">CSV</span>
                  </button>
                  <button
                    type="button"
                    className="row-action row-action--ghost row-action--sm"
                    title="Print report"
                  >
                    <span className="row-action__icon">⎙</span>
                    <span className="row-action__label">Print</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default ReportsPage;
