import { useEffect, useState } from 'react';
import DashboardCharts from '../components/DashboardCharts';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import { resolveSessionRoleKey } from '../roleAccess';
import { supabaseService } from '../supabaseService';

const KPI_DRILLDOWN_BY_LABEL = {
  'Pending review': '#/applications?filter=pending_review',
  'Ready for approval': '#/applications?filter=ready_for_approval',
  'Unserved households': '#/households?filter=unserved_households',
  'SLA breaches (48h+)': '#/applications?filter=sla_breach',
};

const CHART_DRILLDOWNS = {
  monthlyApprovals: '#/reports?filter=monthly_approvals',
  slaTrend: '#/applications?filter=sla_breach',
  programBreakdown: '#/reports?filter=program_breakdown',
  workloadByBarangay: '#/reports?filter=barangay_workload',
};

function DashboardPage({ session }) {
  const [stats, setStats] = useState([]);
  const [cases, setCases] = useState([]);
  const [charts, setCharts] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const roleKey = resolveSessionRoleKey(session);
  const isBarangayScopedRole = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  const scopedBarangayName = session?.barangayName || '';

  useEffect(() => {
    async function initDashboard() {
      supabaseService.setSessionContext(session);

      try {
        const [statRows, caseRows, chartRows] = await Promise.all([
          supabaseService.getDashboardStats(),
          supabaseService.getPriorityCases(),
          supabaseService.getChartData(),
        ]);
        setStats(statRows);
        setCases(caseRows);
        setCharts(chartRows);
        if (caseRows.length > 0) {
          setSelectedCase(caseRows[0]);
        }
      } catch (error) {
        setPageError(error.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    void initDashboard();
  }, [session]);

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
  ];

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="page-load-spinner">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="workspace-page dashboard-page">
      <section className="panel dashboard-kpi-section">
        <SectionHeading
          title="Queue snapshot"
        />
        {pageError ? <div className="auth-alert">{pageError}</div> : null}
        {isBarangayScopedRole ? (
          <div className="application-queue-note">
            <strong>Barangay view</strong>
            <p>Dashboard metrics are scoped to {scopedBarangayName || 'your assigned barangay'}.</p>
          </div>
        ) : null}
        <div className="dashboard-kpi-grid">
          {stats.map((card) => (
            <a
              key={card.label}
              href={KPI_DRILLDOWN_BY_LABEL[card.label] || '#/reports'}
              className="dashboard-kpi-link"
              aria-label={`${card.label} details`}
            >
              <StatCard {...card} />
            </a>
          ))}
        </div>
      </section>

      {charts ? <DashboardCharts data={charts} drilldowns={CHART_DRILLDOWNS} /> : null}

      <section className="panel dashboard-priority-section">
        <SectionHeading eyebrow="Priority queue" title="Cases needing action" />
        <InteractiveTable
          columns={columns}
          rows={cases}
          rowKey="reference"
          selectedKey={selectedCase?.reference}
          onSelectRow={setSelectedCase}
          searchLabel="Search priority cases"
          searchPlaceholder="Search reference, applicant, or status"
          initialSortKey="updatedAt"
          initialSortDirection="desc"
          gridTemplate="1.2fr 1.2fr 1.1fr 1.2fr 0.8fr"
        />
      </section>
    </div>
  );
}

export default DashboardPage;
