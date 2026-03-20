import { useState } from 'react';
import DashboardCharts from '../components/DashboardCharts';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import { dashboardStats, priorityCases } from '../systemData';

// ── Inline action buttons for the priority‑cases table ──────────────────────
function CaseActions({ item }) {
  const [done, setDone] = useState(null);

  if (done) {
    return <span className="row-action-done">{done}</span>;
  }

  // Primary action depends on the case tone / status
  const primary =
    item.tone === 'good'
      ? { label: 'Release', icon: '✓', variant: 'row-action--success' }
      : item.tone === 'warning'
        ? { label: 'Escalate', icon: '↑', variant: 'row-action--warning' }
        : { label: 'Review', icon: '→', variant: 'row-action--primary' };

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
      <button
        type="button"
        className="row-action row-action--ghost"
        title="View full case"
        onClick={() => setDone('Opened')}
      >
        <span className="row-action__icon">⊙</span>
      </button>
    </div>
  );
}

function DashboardPage() {
  const [selectedCase, setSelectedCase] = useState(priorityCases[0]);

  const columns = [
    {
      key: 'reference',
      label: 'Reference',
      render: (item) => <strong>{item.reference}</strong>,
    },
    {
      key: 'applicant',
      label: 'Applicant',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusPill status={item.status} tone={item.tone} />,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      getSortValue: (item) => new Date(item.updatedAt).getTime(),
    },
    {
      key: 'program',
      label: 'Program',
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => <CaseActions item={item} />,
    },
  ];

  return (
    <div className="workspace-page">
      {/* Stat cards — top of page */}
      <section className="panel">
        <SectionHeading eyebrow="Today" title="Queue snapshot" />
        <div className="stats-grid">
          {dashboardStats.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      {/* Charts */}
      <DashboardCharts />

      {/* Priority cases — full width */}
      <section className="panel">
        <SectionHeading eyebrow="Priority queue" title="Cases needing action" />
        <InteractiveTable
          columns={columns}
          rows={priorityCases}
          rowKey="reference"
          selectedKey={selectedCase.reference}
          onSelectRow={setSelectedCase}
          searchLabel="Search priority cases"
          searchPlaceholder="Search reference, applicant, or status"
          initialSortKey="updatedAt"
          initialSortDirection="desc"
          gridTemplate="1.2fr 1.2fr 1.1fr 1.2fr 0.8fr 160px"
        />
        <div className="table-detail">
          <span className="section-eyebrow">Selected case</span>
          <strong>{selectedCase.reference}</strong>
          <p>{selectedCase.applicant}</p>
          <div className="table-detail__meta">
            <StatusPill status={selectedCase.status} tone={selectedCase.tone} />
            <span>{selectedCase.updatedAt}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
