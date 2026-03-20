import { useState } from 'react';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import {
  applicationCaseDetails,
  applicationQueue,
  applicationStats,
  defaultApplicationReference,
  reviewActions,
} from '../systemData';

// ── Per-row action buttons for the application queue ─────────────────────────
function QueueActions({ item }) {
  const [done, setDone] = useState(null);

  if (done) {
    return <span className="row-action-done">{done}</span>;
  }

  // Primary action depends on status / tone
  let primary;
  if (item.tone === 'good') {
    primary = { label: 'Approve', icon: '✓', variant: 'row-action--success' };
  } else if (item.status === 'Duplicate flagged' || item.tone === 'neutral') {
    primary = { label: 'Supervisor', icon: '↑', variant: 'row-action--warning' };
  } else {
    primary = { label: 'Open', icon: '→', variant: 'row-action--primary' };
  }

  const hasDocIssue =
    item.status === 'Need applicant revision' || item.tone === 'default';

  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`row-action ${primary.variant}`}
        title={primary.label}
        onClick={() => setDone(`${primary.label}d`)}
      >
        <span className="row-action__icon">{primary.icon}</span>
        <span className="row-action__label">{primary.label}</span>
      </button>
      {hasDocIssue && (
        <button
          type="button"
          className="row-action row-action--ghost"
          title="Request documents"
          onClick={() => setDone('Requested')}
        >
          <span className="row-action__icon">✉</span>
        </button>
      )}
    </div>
  );
}

function ApplicationsPage() {
  const [selectedReference, setSelectedReference] = useState(defaultApplicationReference);
  const selectedCase = applicationCaseDetails[selectedReference];
  const parseAge = (value) => {
    const match = String(value).match(/^(\d+)([hd])$/i);

    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    const [, amount, unit] = match;
    return unit.toLowerCase() === 'd' ? Number(amount) * 24 : Number(amount);
  };

  const columns = [
    {
      key: 'reference',
      label: 'Reference',
      render: (item) => (
        <strong>
          {item.reference}
          <small>{item.program}</small>
        </strong>
      ),
      getSearchText: (item) => `${item.reference} ${item.program}`,
    },
    {
      key: 'applicant',
      label: 'Applicant',
    },
    {
      key: 'barangay',
      label: 'Barangay',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusPill status={item.status} tone={item.tone} />,
    },
    {
      key: 'age',
      label: 'Age',
      getSortValue: (item) => parseAge(item.age),
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => <QueueActions item={item} />,
    },
  ];

  return (
    <div className="workspace-page">
      <section className="panel">
        <SectionHeading eyebrow="Workload" title="Queue summary" />
        <div className="stats-grid">
          {applicationStats.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="page-grid page-grid--asymmetric">
        <article className="panel">
          <SectionHeading eyebrow="Queue" title="Assigned applications" />
          <InteractiveTable
            columns={columns}
            rows={applicationQueue}
            rowKey="reference"
            selectedKey={selectedReference}
            onSelectRow={(row) => setSelectedReference(row.reference)}
            searchLabel="Search applications"
            searchPlaceholder="Search reference, applicant, barangay, or program"
            initialSortKey="age"
            gridTemplate="1.4fr 1.2fr 1fr 1.2fr 0.6fr 150px"
          />
        </article>

        <article className="panel panel--dark">
          <SectionHeading eyebrow="Selected application" title={selectedCase.reference} />
          <div className="case-summary">
            <div>
              <span>Applicant</span>
              <strong>{selectedCase.applicant}</strong>
            </div>
            <div>
              <span>Program</span>
              <strong>{selectedCase.program}</strong>
            </div>
            <div>
              <span>Household</span>
              <strong>{selectedCase.household}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{selectedCase.submittedAt}</strong>
            </div>
            <div>
              <span>Support type</span>
              <strong>{selectedCase.supportType}</strong>
            </div>
          </div>

          <div className="check-stack">
            {selectedCase.checks.map((item) => (
              <div key={item.title} className={`check-card check-card--${item.state}`}>
                <div className="check-card__marker" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-grid">
        <article className="panel">
          <SectionHeading eyebrow="Documents" title="Requirement status" />
          <div className="list-stack">
            {selectedCase.documents.map((item) => (
              <div key={item.name} className="list-row">
                <div>
                  <strong>{item.name}</strong>
                </div>
                <div className="list-row__end">
                  <StatusPill status={item.status} tone={item.tone} />
                  {item.tone === 'warning' && (
                    <button
                      type="button"
                      className="row-action row-action--ghost row-action--sm"
                      title="Request document"
                    >
                      <span className="row-action__icon">✉</span>
                      <span className="row-action__label">Request</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <SectionHeading eyebrow="Actions" title="Next steps" />
          <div className="action-stack">
            {reviewActions.map((action, i) => (
              <button key={action} type="button" className="action-button">
                {action}
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default ApplicationsPage;
