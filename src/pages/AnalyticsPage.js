import { useMemo } from 'react';
import PageBanner from '../components/PageBanner';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import { analyticsCards, beneficiaryDistribution, reports } from '../systemData';

function AnalyticsPage() {
  const maxValue = useMemo(
    () => Math.max(...beneficiaryDistribution.map((entry) => entry.value)),
    []
  );

  return (
    <main className="main-layout">
      <PageBanner
        eyebrow="Descriptive Analytics"
        title="Fair-distribution dashboards for barangay and municipal decision making."
        description="The first version focuses on operational counts, beneficiary visibility, and service gaps rather than predictive analytics."
        primaryAction={{ href: '#/blueprint', label: 'Review blueprint' }}
        secondaryAction={{ href: '#/staff', label: 'Return to staff view' }}
      />

      <div className="workspace-grid">
        <section className="panel">
          <SectionHeading
            eyebrow="Descriptive Analytics"
            title="Operational counts for program oversight"
            description="The analytics layer emphasizes fair distribution, staffing visibility, and queue health before advanced modeling."
          />
          <div className="stats-grid">
            {analyticsCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        <section className="panel panel--split">
          <div>
            <SectionHeading
              eyebrow="Beneficiaries by Barangay"
              title="Program volume distribution"
              description="These cards represent the type of charting planned for the production stack."
            />
            <div className="chart-card">
              {beneficiaryDistribution.map((entry) => (
                <div key={entry.label} className="bar-row">
                  <div className="bar-row__labels">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(entry.value / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="Report Library"
              title="Exports for operations and planning"
              description="Reports are designed around beneficiary coverage, review bottlenecks, and household assistance history."
            />
            <div className="record-stack">
              {reports.map((report) => (
                <article key={report.title} className="record-card">
                  <span>{report.title}</span>
                  <strong>{report.metric}</strong>
                  <small>{report.note}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AnalyticsPage;
