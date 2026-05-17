import { useEffect, useState } from 'react';
import DashboardCharts, { GenderPieChart, ProgramAvailChart } from '../components/DashboardCharts';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import { getTierByKey } from '../incomeClassification';
import { resolveSessionRoleKey } from '../roleAccess';
import { supabaseService } from '../supabaseService';

const KPI_DRILLDOWN_BY_LABEL = {
  'Pending review': '#/applications?filter=pending_review',
  'Ready for approval': '#/applications?filter=ready_for_approval',
  'Unserved households': '#/households?filter=unserved_households',
  'SLA breaches (48h+)': '#/applications?filter=sla_breach',
};

const CHART_DRILLDOWNS = {
  slaTrend: '#/applications?filter=sla_breach',
  workloadByBarangay: '#/reports?filter=barangay_workload',
};

// â"€â"€â"€ sub-components â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function RegistryKpiCard({ label, value, sub, tone, href }) {
  const normalizedValue = (() => {
    if (value == null) return '0';
    const text = String(value).trim();
    if (!text) return '0';
    if (text === '-' || text === '—') return '0';
    if (text.includes('Ã¢â‚¬') || text.includes('—') || text.includes('Ã')) return '0';
    return text;
  })();

  const inner = (
    <div className={`dashboard-registry-card dashboard-registry-card--${tone || 'default'}`}>
      <strong className="dashboard-registry-card__value">{normalizedValue}</strong>
      <span className="dashboard-registry-card__label">{label}</span>
      {sub && <small className="dashboard-registry-card__sub">{sub}</small>}
    </div>
  );
  return href
    ? <a href={href} className="dashboard-registry-card-link">{inner}</a>
    : inner;
}

function IncomeClassificationPanel({ breakdown, tupadEnabled = true }) {
  if (!breakdown?.length) return null;
  const total = breakdown.reduce((sum, tier) => sum + tier.count, 0) || 1;
  const tupadCount = breakdown
    .filter((t) => t.key === 'no_income' || t.key === 'low_income')
    .reduce((sum, t) => sum + t.count, 0);

  return (
    <section className="panel dashboard-income-panel">
      <SectionHeading
        eyebrow="Targeting"
        title="Income classification"
        description={tupadEnabled
          ? 'Household distribution by monthly income of head. TUPAD priority: No Income and Low Income tiers.'
          : 'Household distribution by monthly income of head.'}
      />

      {tupadEnabled ? (
        <div className="dashboard-tupad-highlight">
          <div className="dashboard-tupad-highlight__number">{tupadCount}</div>
          <div className="dashboard-tupad-highlight__text">
            <strong>TUPAD priority households</strong>
            <span>No Income + Low Income &mdash; {Math.round((tupadCount / total) * 100)}% of registry</span>
          </div>
          <a href="#/households" className="dashboard-tupad-highlight__link">
            View households &rarr;
          </a>
        </div>
      ) : null}

      {/* Tier breakdown bars */}
      <div className="dashboard-income-tiers">
        {breakdown.map((item) => {
          const tier = getTierByKey(item.key);
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={item.key} className="dashboard-income-tier-row">
              <div className="dashboard-income-tier-row__header">
                <span
                  className="dashboard-income-tier-dot"
                  style={{ background: tier.color }}
                />
                <span className="dashboard-income-tier-row__label">
                  {tier.label}
                  {tupadEnabled && tier.tupadPriority && (
                    <span className="dashboard-tupad-tag">TUPAD</span>
                  )}
                </span>
                <span className="dashboard-income-tier-row__range">{tier.range}</span>
                <strong className="dashboard-income-tier-row__count">{item.count} hh</strong>
              </div>
              <div className="dashboard-income-tier-track">
                <div
                  className="dashboard-income-tier-fill"
                  style={{ width: `${pct}%`, background: tier.color }}
                />
                <span className="dashboard-income-tier-pct">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LowIncomeRankingPanel({ ranking, tupadEnabled = true }) {
  if (!ranking?.length) return null;
  const maxTotal = Math.max(...ranking.map((r) => r.total), 1);

  return (
    <section className="panel dashboard-ranking-panel">
      <SectionHeading
        eyebrow="Priority ranking"
        title="Low income households by barangay"
        description={tupadEnabled
          ? 'Barangays ranked by combined No Income + Low Income household count - TUPAD targeting priority.'
          : 'Barangays ranked by combined No Income + Low Income household count.'}
      />
      <div className="dashboard-ranking-list">
        {ranking.map((item, index) => (
          <div key={item.barangay} className="dashboard-ranking-row">
            <span className="dashboard-ranking-row__rank">#{index + 1}</span>
            <div className="dashboard-ranking-row__body">
              <div className="dashboard-ranking-row__header">
                <strong>{item.barangay}</strong>
                <div className="dashboard-ranking-row__counts">
                  <span className="dashboard-ranking-tag dashboard-ranking-tag--indigent">
                    {item.noIncome} indigent
                  </span>
                  <span className="dashboard-ranking-tag dashboard-ranking-tag--low">
                    {item.lowIncome} low income
                  </span>
                  <strong>{item.total} total</strong>
                </div>
              </div>
              <div className="dashboard-ranking-track">
                <div
                  className="dashboard-ranking-fill dashboard-ranking-fill--indigent"
                  style={{ width: `${(item.noIncome / maxTotal) * 100}%` }}
                />
                <div
                  className="dashboard-ranking-fill dashboard-ranking-fill--low"
                  style={{ width: `${(item.lowIncome / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-ranking-legend">
        <span><span className="dashboard-ranking-legend-dot dashboard-ranking-legend-dot--indigent" />No Income (indigent)</span>
        <span><span className="dashboard-ranking-legend-dot dashboard-ranking-legend-dot--low" />Low Income</span>
      </div>
    </section>
  );
}

// â"€â"€â"€ DashboardPage â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function DashboardPage({ session }) {
  const [stats, setStats] = useState([]);
  const [cases, setCases] = useState([]);
  const [charts, setCharts] = useState(null);
  const [householdAnalytics, setHouseholdAnalytics] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sectionErrors, setSectionErrors] = useState({});
  const roleKey = resolveSessionRoleKey(session);
  const isBarangayScopedRole = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  const scopedBarangayName = session?.barangayName || '';

  useEffect(() => {
    async function initDashboard() {
      supabaseService.setSessionContext(session);

      const settle = (promise, key) =>
        promise
          .then((value) => ({ key, value }))
          .catch((err) => ({ key, error: err.message || `Failed to load ${key}` }));

      const results = await Promise.all([
        settle(supabaseService.getDashboardStats(), 'stats'),
        settle(supabaseService.getPriorityCases(), 'cases'),
        settle(supabaseService.getChartData(), 'charts'),
        settle(supabaseService.getHouseholdAnalytics(), 'households'),
      ]);

      const errors = {};
      for (const result of results) {
        if (result.error) {
          errors[result.key] = result.error;
        } else {
          if (result.key === 'stats') setStats(result.value);
          if (result.key === 'cases') {
            setCases(result.value);
            if (result.value.length > 0) setSelectedCase(result.value[0]);
          }
          if (result.key === 'charts') setCharts(result.value);
          if (result.key === 'households') setHouseholdAnalytics(result.value);
        }
      }
      if (Object.keys(errors).length > 0) setSectionErrors(errors);
      setLoading(false);
    }

    void initDashboard();
  }, [session]);

  const columns = [
    { key: 'reference', label: 'Reference', render: (item) => <strong>{item.reference}</strong> },
    { key: 'applicant', label: 'Applicant' },
    { key: 'status', label: 'Status', render: (item) => <StatusPill status={item.status} tone={item.tone} /> },
    { key: 'updatedAt', label: 'Updated', getSortValue: (item) => new Date(item.updatedAt).getTime() },
    { key: 'program', label: 'Program' },
  ];

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="page-load-spinner" role="status" aria-live="polite">
          Loading dashboard data...
        </div>
      </div>
    );
  }

  const summary = householdAnalytics?.summary;
  const tupadEnabled = summary?.tupadProgramEnabled !== false;
  const hasErrors = Object.keys(sectionErrors).length > 0;
  const queueStats = isBarangayScopedRole
    ? stats.filter((card) => card.label !== 'Unserved households')
    : stats;

  return (
    <div className="workspace-page dashboard-page">

      {hasErrors && (
        <div className="dashboard-section-errors">
          {Object.entries(sectionErrors).map(([key, msg]) => (
            <div key={key} className="auth-alert auth-alert--soft">{msg}</div>
          ))}
        </div>
      )}
      {isBarangayScopedRole ? (
        <div className="application-queue-note">
          <strong>Barangay view</strong>
          <p>Dashboard metrics are scoped to {scopedBarangayName || 'your assigned barangay'}.</p>
        </div>
      ) : null}

      {/* â"€â"€ Registry Overview â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {summary && (
        <section className="panel dashboard-registry-section">
          <SectionHeading eyebrow="Registry" title="Household overview" />
          <div className="dashboard-registry-grid">
            <RegistryKpiCard
              label="Registered residents"
              value={summary.totalResidents.toLocaleString()}
              sub="Total members across all households"
              tone="accent"
              href="#/households"
            />
            <RegistryKpiCard
              label="Registered households"
              value={summary.totalHouseholds.toLocaleString()}
              sub="Active household records"
              tone="default"
              href="#/households"
            />
            {tupadEnabled ? (
              <RegistryKpiCard
                label="TUPAD priority"
                value={summary.tupadPriorityHouseholds.toLocaleString()}
                sub="No Income + Low Income households"
                tone="warning"
                href="#/households?filter=tupad_priority"
              />
            ) : null}
            <RegistryKpiCard
              label="Indigent (no income)"
              value={summary.indigentHouseholds.toLocaleString()}
              sub={tupadEnabled ? 'Highest TUPAD priority' : 'No monthly income recorded'}
              tone="danger"
              href="#/households?filter=indigent"
            />
            <RegistryKpiCard
              label="Active cases"
              value={summary.householdsWithActiveCases?.toLocaleString() ?? '—'}
              sub="Households with open applications"
              tone="neutral"
              href="#/applications"
            />
            <RegistryKpiCard
              label="Lumon households"
              value={summary.lumonHouseholds?.toLocaleString() ?? '—'}
              sub="Households with person-level Lumon tags"
              tone="neutral"
              href="#/households?filter=lumon"
            />
          </div>
        </section>
      )}

      {/* â"€â"€ Income Classification + Low Income Ranking â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="dashboard-analytics-row">
        <IncomeClassificationPanel breakdown={householdAnalytics?.classificationBreakdown} tupadEnabled={tupadEnabled} />
        <LowIncomeRankingPanel ranking={householdAnalytics?.lowIncomeByBarangay} tupadEnabled={tupadEnabled} />
      </div>

      {/* â"€â"€ Application Queue KPIs â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="panel dashboard-kpi-section">
        <SectionHeading title="Queue snapshot" />
        <div className="dashboard-kpi-grid">
          {queueStats.map((card) => (
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

      {/* â"€â"€ Program Avail Chart + Gender breakdown â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="dashboard-program-gender-row">
        <ProgramAvailChart programAvail={charts?.programAvail} />
        <GenderPieChart genderBreakdown={householdAnalytics?.genderBreakdown} />
      </div>

      {/* â"€â"€ Trend Charts â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {charts ? <DashboardCharts data={charts} drilldowns={CHART_DRILLDOWNS} /> : null}

      {/* â"€â"€ Priority Cases â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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
