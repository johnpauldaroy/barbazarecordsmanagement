import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { resolveSessionRoleKey } from '../roleAccess';
import { supabaseService } from '../supabaseService';
import { exportToCsv } from '../utils/exportCsv';
import { exportToPdf } from '../utils/exportPdf';

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  submitted:       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  under_review:    { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  needs_more_info: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  verified:        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  approved:        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  released:        { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  rejected:        { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  returned:        { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
};

function StatusPill({ status, label }) {
  const style = STATUS_COLORS[status] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: '999px', padding: '0.15rem 0.6rem',
      fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Export toolbar ────────────────────────────────────────────────────────────

function ExportBar({ onCsv, onPdf, disabled, label }) {
  return (
    <div className="reports-export-bar">
      <span className="reports-export-bar__label">{label}</span>
      <div className="reports-export-bar__actions">
        <button
          type="button"
          className="reports-export-btn"
          onClick={onCsv}
          disabled={disabled}
          title="Export as CSV"
        >
          CSV
        </button>
        <button
          type="button"
          className="reports-export-btn reports-export-btn--pdf"
          onClick={onPdf}
          disabled={disabled}
          title="Export as PDF"
        >
          PDF
        </button>
      </div>
    </div>
  );
}

// ── Simple sortable table ─────────────────────────────────────────────────────

function ReportTable({ columns, rows, emptyMessage }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const va = String(a[sortKey] ?? '').toLowerCase();
      const vb = String(b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (!rows.length) {
    return (
      <div className="application-queue-note reports-empty-state">
        <strong>{emptyMessage || 'No records found.'}</strong>
      </div>
    );
  }

  return (
    <div className="ui-table-wrapper reports-table-wrapper">
      <table className="ui-table">
        <thead className="ui-table-header">
          <tr className="ui-table-row">
            {columns.map((col) => (
              <th
                key={col.key}
                className="ui-table-cell ui-table-cell--header reports-th"
                style={{ width: col.width, textAlign: col.align || 'left', cursor: col.sortable !== false ? 'pointer' : 'default' }}
                onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
              >
                {col.header}
                {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr key={row.id ?? index} className="ui-table-row">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="ui-table-cell"
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Highlights tab ────────────────────────────────────────────────────────────

function HighlightsTab({ stats, households, isBarangayScoped, scopedBarangayName }) {
  const summary = households?.summary ?? {};
  const breakdown = households?.classificationBreakdown ?? [];

  const highlightKpis = [
    { label: 'Total Households', value: String(summary.totalHouseholds ?? 0), trend: 'Registered households', tone: 'accent' },
    { label: 'Total Residents', value: String(summary.totalResidents ?? 0), trend: 'Household members on record', tone: 'good' },
    { label: 'TUPAD Priority', value: String(summary.tupadPriorityHouseholds ?? 0), trend: 'Low/no-income, eligible for TUPAD', tone: 'warning' },
    { label: 'Active Cases', value: String(summary.householdsWithActiveCases ?? 0), trend: 'Households with open applications', tone: 'accent' },
  ];

  const totalBreakdown = breakdown.reduce((sum, t) => sum + t.count, 0) || 1;

  return (
    <div className="space-y-6">
      <section className="panel space-y-4">
        <SectionHeading eyebrow="Summary" title="Reporting highlights" />
        <div className="stats-grid">
          {stats.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="panel space-y-4">
        <SectionHeading eyebrow="Households" title="Household overview" />
        <div className="stats-grid">
          {highlightKpis.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="panel space-y-4">
        <SectionHeading
          eyebrow="Income Classification"
          title="Household income breakdown"
          description={isBarangayScoped ? `Showing income tiers for ${scopedBarangayName}.` : 'Income distribution across all barangays.'}
        />
        <div className="reports-income-grid">
          {breakdown.map((tier) => (
            <div key={tier.key} className="reports-income-card">
              <div className="reports-income-card__bar-wrap">
                <div
                  className="reports-income-card__bar"
                  style={{ width: `${Math.round((tier.count / totalBreakdown) * 100)}%` }}
                />
              </div>
              <div className="reports-income-card__info">
                <span className="reports-income-card__label">{tier.label}</span>
                <span className="reports-income-card__count">{tier.count} <small>({tier.percentage}%)</small></span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Applications tab ──────────────────────────────────────────────────────────

const APP_COLUMNS = [
  { key: 'reference', header: 'Reference No.', width: '160px' },
  { key: 'applicant', header: 'Applicant' },
  { key: 'barangay',  header: 'Barangay', width: '140px' },
  { key: 'program',   header: 'Program', width: '160px' },
  { key: 'status',    header: 'Status', width: '150px', sortable: false,
    render: (row) => <StatusPill status={row.rawStatus} label={row.status} /> },
  { key: 'submittedAt', header: 'Date submitted', width: '120px' },
  { key: 'daysDelayedLabel', header: 'Days delayed', width: '120px', align: 'center' },
];

const APP_EXPORT_COLS = [
  { key: 'reference',   header: 'Reference No.' },
  { key: 'applicant',   header: 'Applicant' },
  { key: 'barangay',    header: 'Barangay' },
  { key: 'program',     header: 'Program' },
  { key: 'status',      header: 'Status' },
  { key: 'submittedAt', header: 'Date Submitted' },
  { key: 'daysDelayedLabel', header: 'Days Delayed' },
];

function ApplicationsTab({ rows, isBarangayScoped, scopedBarangayName }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');

  const barangays = useMemo(() => [...new Set(rows.map((r) => r.barangay).filter(Boolean))].sort(), [rows]);
  const statuses = useMemo(() => [...new Set(rows.map((r) => r.rawStatus).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || row.reference.toLowerCase().includes(q)
      || row.applicant.toLowerCase().includes(q)
      || row.barangay.toLowerCase().includes(q)
      || row.program.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || row.rawStatus === statusFilter;
    const matchBarangay = barangayFilter === 'all' || row.barangay === barangayFilter;
    return matchSearch && matchStatus && matchBarangay;
  }), [rows, search, statusFilter, barangayFilter]);

  const handleCsv = () => exportToCsv(
    `applications-report-${new Date().toISOString().slice(0, 10)}`,
    APP_EXPORT_COLS,
    filtered
  );

  const handlePdf = () => exportToPdf(
    `applications-report-${new Date().toISOString().slice(0, 10)}`,
    'Applications Report',
    APP_EXPORT_COLS,
    filtered,
    isBarangayScoped ? `Barangay: ${scopedBarangayName}` : 'All barangays — Barbaza MSWD'
  );

  return (
    <section className="panel space-y-4">
      <SectionHeading
        eyebrow="Applications"
        title="Applications report"
        description={isBarangayScoped ? `Records for ${scopedBarangayName}.` : 'All applications across barangays.'}
      />

      <div className="reports-filter-bar">
        <input
          type="search"
          className="reports-search-input"
          placeholder="Search reference, applicant, program…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="reports-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        {!isBarangayScoped && (
          <select
            className="reports-select"
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
          >
            <option value="all">All barangays</option>
            {barangays.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
      </div>

      <ExportBar
        label={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        disabled={!filtered.length}
        onCsv={handleCsv}
        onPdf={handlePdf}
      />

      <ReportTable
        columns={APP_COLUMNS}
        rows={filtered}
        emptyMessage="No applications match the current filters."
      />
    </section>
  );
}

// ── Households tab ────────────────────────────────────────────────────────────

const HH_COLUMNS = [
  { key: 'code',    header: 'Code', width: '140px' },
  { key: 'head',    header: 'Head of Household' },
  { key: 'barangay', header: 'Barangay', width: '130px' },
  { key: 'members', header: 'Members', width: '80px', align: 'center' },
  { key: 'incomeTier', header: 'Income Tier', width: '160px' },
  { key: 'monthlyIncome', header: 'Monthly Income', width: '130px', align: 'right' },
  { key: 'programs', header: 'Programs Availed', width: '180px' },
];

const HH_EXPORT_COLS = [
  { key: 'code',    header: 'Code' },
  { key: 'head',    header: 'Head of Household' },
  { key: 'barangay', header: 'Barangay' },
  { key: 'members', header: 'Members' },
  { key: 'incomeTier', header: 'Income Tier' },
  { key: 'monthlyIncome', header: 'Monthly Income (PHP)' },
  { key: 'programs', header: 'Programs' },
];

const INCOME_TIER_LABELS = {
  no_income: 'No Income / No Work',
  low_income: 'Low Income',
  moderate: 'Moderate Income',
  above_moderate: 'Above Moderate',
};

const INCOME_TIER_COLORS = {
  no_income:     { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  low_income:    { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  moderate:      { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  above_moderate:{ color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
};

function IncomeTierPill({ tierKey }) {
  const label = INCOME_TIER_LABELS[tierKey] || tierKey;
  const style = INCOME_TIER_COLORS[tierKey] ?? { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: '999px', padding: '0.15rem 0.6rem',
      fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function HouseholdsTab({ rows, lowIncomeByBarangay, isBarangayScoped, scopedBarangayName }) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');

  const barangays = useMemo(() => [...new Set(rows.map((r) => r.barangay).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || row.code.toLowerCase().includes(q)
      || (row.head || '').toLowerCase().includes(q)
      || row.barangay.toLowerCase().includes(q);
    const matchTier = tierFilter === 'all' || row.tierKey === tierFilter;
    const matchBarangay = barangayFilter === 'all' || row.barangay === barangayFilter;
    return matchSearch && matchTier && matchBarangay;
  }), [rows, search, tierFilter, barangayFilter]);

  const displayRows = filtered.map((row) => ({
    ...row,
    monthlyIncome: row.monthlyIncomeRaw != null
      ? `₱${Number(row.monthlyIncomeRaw).toLocaleString('en-PH')}`
      : '—',
  }));

  const columnsWithRender = HH_COLUMNS.map((col) => {
    if (col.key === 'incomeTier') {
      return { ...col, render: (row) => <IncomeTierPill tierKey={row.tierKey} /> };
    }
    return col;
  });

  const handleCsv = () => exportToCsv(
    `households-report-${new Date().toISOString().slice(0, 10)}`,
    HH_EXPORT_COLS,
    filtered.map((r) => ({
      ...r,
      incomeTier: INCOME_TIER_LABELS[r.tierKey] || r.tierKey,
      monthlyIncome: r.monthlyIncomeRaw != null ? Number(r.monthlyIncomeRaw) : '',
    }))
  );

  const handlePdf = () => exportToPdf(
    `households-report-${new Date().toISOString().slice(0, 10)}`,
    'Households Report',
    HH_EXPORT_COLS,
    filtered.map((r) => ({
      ...r,
      incomeTier: INCOME_TIER_LABELS[r.tierKey] || r.tierKey,
      monthlyIncome: r.monthlyIncomeRaw != null ? `PHP ${Number(r.monthlyIncomeRaw).toLocaleString()}` : '—',
    })),
    isBarangayScoped ? `Barangay: ${scopedBarangayName}` : 'All barangays — Barbaza MSWD'
  );

  return (
    <div className="space-y-4">
      <section className="panel space-y-4">
        <SectionHeading
          eyebrow="Households"
          title="Household registry"
          description={isBarangayScoped ? `Records for ${scopedBarangayName}.` : 'All registered households.'}
        />

        <div className="reports-filter-bar">
          <input
            type="search"
            className="reports-search-input"
            placeholder="Search code, head, barangay…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="reports-select" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option value="all">All income tiers</option>
            <option value="no_income">No Income / No Work</option>
            <option value="low_income">Low Income</option>
            <option value="moderate">Moderate Income</option>
            <option value="above_moderate">Above Moderate</option>
          </select>
          {!isBarangayScoped && (
            <select className="reports-select" value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
              <option value="all">All barangays</option>
              {barangays.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>

        <ExportBar
          label={`${filtered.length} household${filtered.length !== 1 ? 's' : ''}`}
          disabled={!filtered.length}
          onCsv={handleCsv}
          onPdf={handlePdf}
        />

        <ReportTable
          columns={columnsWithRender}
          rows={displayRows}
          emptyMessage="No households match the current filters."
        />
      </section>

      {!isBarangayScoped && lowIncomeByBarangay?.length ? (
        <section className="panel space-y-4">
          <SectionHeading eyebrow="Priority" title="Low-income households by barangay" />
          <div className="bar-list">
            {lowIncomeByBarangay.map((item) => {
              const max = Math.max(...lowIncomeByBarangay.map((x) => x.total), 1);
              return (
                <div key={item.barangay} className="bar-row">
                  <div className="bar-row__labels">
                    <strong>{item.barangay}</strong>
                    <span>{item.total} households</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill--warning" style={{ width: `${(item.total / max) * 100}%` }} />
                  </div>
                  <small>{item.noIncome} no income · {item.lowIncome} low income</small>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ── Release Report tab ────────────────────────────────────────────────────────

const RELEASE_COLUMNS = [
  { key: 'reference',       header: 'Reference No.',  width: '150px' },
  { key: 'applicant',       header: 'Applicant' },
  { key: 'household',       header: 'Household',      width: '130px' },
  { key: 'barangay',        header: 'Barangay',       width: '130px' },
  { key: 'program',         header: 'Program',        width: '160px' },
  { key: 'amountFormatted', header: 'Amount',         width: '120px', align: 'right' },
  { key: 'releasedAt',      header: 'Date Released',  width: '120px' },
  { key: 'remarks',         header: 'Remarks' },
];

const RELEASE_EXPORT_COLS = [
  { key: 'reference',       header: 'Reference No.' },
  { key: 'applicant',       header: 'Applicant' },
  { key: 'household',       header: 'Household' },
  { key: 'barangay',        header: 'Barangay' },
  { key: 'program',         header: 'Program' },
  { key: 'amountFormatted', header: 'Approved Amount' },
  { key: 'releasedAt',      header: 'Date Released' },
  { key: 'remarks',         header: 'Remarks' },
];

// ── Assistance tab ────────────────────────────────────────────────────────────

const ASSIST_COLUMNS = [
  { key: 'reference', header: 'Reference No.', width: '160px' },
  { key: 'household', header: 'Household', width: '130px' },
  { key: 'program',   header: 'Program' },
  { key: 'barangay',  header: 'Barangay', width: '130px' },
  { key: 'amountFormatted', header: 'Amount', width: '110px', align: 'right' },
  { key: 'status',    header: 'Status', width: '110px',
    render: (row) => <StatusPill status={row.status === 'released' ? 'released' : 'approved'} label={row.status} /> },
  { key: 'releasedAt', header: 'Released Date', width: '120px' },
];

const ASSIST_EXPORT_COLS = [
  { key: 'reference',      header: 'Reference No.' },
  { key: 'household',      header: 'Household Code' },
  { key: 'program',        header: 'Program' },
  { key: 'barangay',       header: 'Barangay' },
  { key: 'amountFormatted', header: 'Amount' },
  { key: 'status',         header: 'Status' },
  { key: 'releasedAt',     header: 'Released Date' },
];

function formatCurrencyDisplay(amount) {
  return `₱${Number(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function AssistanceTab({ data, isBarangayScoped, scopedBarangayName }) {
  const rows = useMemo(() => (Array.isArray(data?.rows) ? data.rows : []), [data?.rows]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');

  const barangays = useMemo(() => [...new Set(rows.map((r) => r.barangay).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || row.reference.toLowerCase().includes(q)
      || row.household.toLowerCase().includes(q)
      || row.program.toLowerCase().includes(q)
      || row.barangay.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || row.status === statusFilter;
    const matchBarangay = barangayFilter === 'all' || row.barangay === barangayFilter;
    return matchSearch && matchStatus && matchBarangay;
  }), [rows, search, statusFilter, barangayFilter]);

  const totalFiltered = filtered.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const releasedFiltered = filtered
    .filter((r) => r.status === 'released')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const handleCsv = () => exportToCsv(
    `assistance-report-${new Date().toISOString().slice(0, 10)}`,
    ASSIST_EXPORT_COLS,
    filtered
  );

  const handlePdf = () => exportToPdf(
    `assistance-report-${new Date().toISOString().slice(0, 10)}`,
    'Assistance Released Report',
    ASSIST_EXPORT_COLS,
    filtered,
    isBarangayScoped ? `Barangay: ${scopedBarangayName}` : 'All barangays — Barbaza MSWD'
  );

  return (
    <div className="space-y-4">
      <section className="panel space-y-4">
        <SectionHeading
          eyebrow="Assistance"
          title="Released assistance report"
          description={isBarangayScoped ? `Records for ${scopedBarangayName}.` : 'All assistance records across barangays.'}
        />

        <div className="reports-assist-summary">
          <div className="reports-assist-kpi">
            <span>Released this month</span>
            <strong>{formatCurrencyDisplay(data?.releasedThisMonth ?? 0)}</strong>
          </div>
          <div className="reports-assist-kpi">
            <span>Total released</span>
            <strong>{formatCurrencyDisplay(data?.totalReleased ?? 0)}</strong>
          </div>
          <div className="reports-assist-kpi">
            <span>Filtered total</span>
            <strong>{formatCurrencyDisplay(totalFiltered)}</strong>
          </div>
          <div className="reports-assist-kpi">
            <span>Filtered released</span>
            <strong>{formatCurrencyDisplay(releasedFiltered)}</strong>
          </div>
        </div>

        <div className="reports-filter-bar">
          <input
            type="search"
            className="reports-search-input"
            placeholder="Search reference, household, program…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="reports-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="released">Released</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
          {!isBarangayScoped && (
            <select className="reports-select" value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
              <option value="all">All barangays</option>
              {barangays.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>

        <ExportBar
          label={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          disabled={!filtered.length}
          onCsv={handleCsv}
          onPdf={handlePdf}
        />

        <ReportTable
          columns={ASSIST_COLUMNS}
          rows={filtered}
          emptyMessage="No assistance records match the current filters."
        />
      </section>
    </div>
  );
}

// ── Workload tab ──────────────────────────────────────────────────────────────

function WorkloadTab({ workload, byProgram, isBarangayScoped, scopedBarangayName }) {
  const maxPending = Math.max(...(workload ?? []).map((item) => item.pending), 1);

  const wlExportCols = [
    { key: 'barangay', header: 'Barangay' },
    { key: 'pending',  header: 'Pending' },
    { key: 'approved', header: 'Approved This Month' },
  ];

  const progExportCols = [
    { key: 'program',  header: 'Program' },
    { key: 'total',    header: 'Total' },
    { key: 'pending',  header: 'Pending' },
    { key: 'approved', header: 'Approved' },
    { key: 'released', header: 'Released' },
  ];

  const handleWlCsv = () => exportToCsv(`workload-${new Date().toISOString().slice(0, 10)}`, wlExportCols, workload ?? []);
  const handleWlPdf = () => exportToPdf(
    `workload-${new Date().toISOString().slice(0, 10)}`,
    'Workload by Barangay',
    wlExportCols,
    workload ?? [],
    isBarangayScoped ? `Barangay: ${scopedBarangayName}` : 'All barangays — Barbaza MSWD'
  );

  const handleProgCsv = () => exportToCsv(`programs-${new Date().toISOString().slice(0, 10)}`, progExportCols, byProgram ?? []);
  const handleProgPdf = () => exportToPdf(
    `programs-${new Date().toISOString().slice(0, 10)}`,
    'Applications by Program',
    progExportCols,
    byProgram ?? [],
    isBarangayScoped ? `Barangay: ${scopedBarangayName}` : 'All barangays — Barbaza MSWD'
  );

  return (
    <div className="space-y-4">
      <section className="panel space-y-4">
        <SectionHeading
          eyebrow="Workload"
          title="Pending by barangay"
          description={isBarangayScoped
            ? `Queue pressure for ${scopedBarangayName}.`
            : 'Queue pressure and approvals across all barangays.'}
        />
        <ExportBar
          label={`${(workload ?? []).length} barangay${(workload ?? []).length !== 1 ? 's' : ''}`}
          disabled={!(workload ?? []).length}
          onCsv={handleWlCsv}
          onPdf={handleWlPdf}
        />
        {(workload ?? []).length ? (
          <div className="bar-list">
            {workload.map((item) => (
              <div key={item.barangay} className="bar-row">
                <div className="bar-row__labels">
                  <strong>{item.barangay}</strong>
                  <span>{item.pending} pending</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(item.pending / maxPending) * 100}%` }} />
                </div>
                <small>{item.approved} approved this month</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="application-queue-note reports-empty-state">
            <strong>No workload records found.</strong>
          </div>
        )}
      </section>

      {(byProgram ?? []).length ? (
        <section className="panel space-y-4">
          <SectionHeading eyebrow="Programs" title="Applications by program" />
          <ExportBar
            label={`${byProgram.length} program${byProgram.length !== 1 ? 's' : ''}`}
            disabled={!byProgram.length}
            onCsv={handleProgCsv}
            onPdf={handleProgPdf}
          />
          <ReportTable
            columns={[
              { key: 'program',  header: 'Program' },
              { key: 'total',    header: 'Total',    width: '80px', align: 'center' },
              { key: 'pending',  header: 'Pending',  width: '80px', align: 'center' },
              { key: 'approved', header: 'Approved', width: '90px', align: 'center' },
              { key: 'released', header: 'Released', width: '90px', align: 'center' },
            ]}
            rows={byProgram}
            emptyMessage="No program data found."
          />
        </section>
      ) : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ReportsPage({ session }) {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [activeTab, setActiveTab] = useState('highlights');
  const [selectedBarangay, setSelectedBarangay] = useState('all');

  const [stats, setStats] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [households, setHouseholds] = useState(null);
  const [householdRows, setHouseholdRows] = useState([]);
  const [applicationsRows, setApplicationsRows] = useState([]);
  const [assistanceData, setAssistanceData] = useState(null);
  const [byProgram, setByProgram] = useState([]);
  const [allBarangays, setAllBarangays] = useState([]);

  const [releaseRows, setReleaseRows] = useState([]);
  const [releaseFromDate, setReleaseFromDate] = useState('');
  const [releaseToDate, setReleaseToDate] = useState('');
  const [releaseSearch, setReleaseSearch] = useState('');
  const [loadingRelease, setLoadingRelease] = useState(false);

  const roleKey = resolveSessionRoleKey(session);
  const isAdmin = roleKey === 'admin';
  const isBarangayScoped = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  // For barangay staff the scope is fixed; for admin it follows the selector
  const effectiveBarangay = isBarangayScoped
    ? (session?.barangayName || '')
    : (selectedBarangay === 'all' ? '' : selectedBarangay);
  const isFiltered = Boolean(effectiveBarangay);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      supabaseService.setSessionContext(session);
      setLoading(true);
      setPageError('');

      try {
        const [summary, chartData, hhAnalytics, hhReportRows, appRows, assistData, progRows, barangays] = await Promise.all([
          supabaseService.getReportsSummary(),
          supabaseService.getChartData(),
          supabaseService.getHouseholdAnalytics(),
          supabaseService.getHouseholdsReport(),
          supabaseService.getApplicationsReport(),
          supabaseService.getAssistanceReport(),
          supabaseService.getApplicationsByProgram(),
          isAdmin ? supabaseService.getBarangays() : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        setStats(summary);
        setWorkload(chartData.workloadByBarangay);
        setHouseholds(hhAnalytics);
        setByProgram(progRows);
        setApplicationsRows(appRows);
        setAssistanceData(assistData);
        setHouseholdRows(hhReportRows ?? []);
        setAllBarangays(barangays ?? []);
      } catch (error) {
        if (isMounted) setPageError(error.message || 'Failed to load reports.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => { isMounted = false; };
  }, [session, isAdmin]);

  useEffect(() => {
    if (activeTab !== 'release') return;
    let isMounted = true;
    async function loadRelease() {
      setLoadingRelease(true);
      try {
        supabaseService.setSessionContext(session);
        const rows = await supabaseService.getReleaseReport({
          fromDate: releaseFromDate || null,
          toDate: releaseToDate || null,
        });
        if (isMounted) setReleaseRows(rows);
      } catch {
        if (isMounted) setReleaseRows([]);
      } finally {
        if (isMounted) setLoadingRelease(false);
      }
    }
    void loadRelease();
    return () => { isMounted = false; };
  }, [activeTab, releaseFromDate, releaseToDate, session]);

  // Filter all data by the selected barangay (admin only)
  const filteredAppRows = useMemo(() =>
    isFiltered ? applicationsRows.filter((r) => r.barangay === effectiveBarangay) : applicationsRows,
  [applicationsRows, isFiltered, effectiveBarangay]);

  const filteredHhRows = useMemo(() =>
    isFiltered ? householdRows.filter((r) => r.barangay === effectiveBarangay) : householdRows,
  [householdRows, isFiltered, effectiveBarangay]);

  const filteredWorkload = useMemo(() =>
    isFiltered ? workload.filter((r) => r.barangay === effectiveBarangay) : workload,
  [workload, isFiltered, effectiveBarangay]);

  const filteredByProgram = useMemo(() => {
    if (!isFiltered) return byProgram;
    // Re-aggregate programs from filtered applications
    const map = {};
    for (const app of filteredAppRows) {
      const prog = app.program || '—';
      if (!map[prog]) map[prog] = { program: prog, total: 0, pending: 0, approved: 0, released: 0 };
      map[prog].total += 1;
      const s = app.rawStatus;
      if (['submitted', 'under_review', 'needs_more_info', 'verified'].includes(s)) map[prog].pending += 1;
      else if (s === 'approved') map[prog].approved += 1;
      else if (s === 'released') map[prog].released += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [byProgram, isFiltered, filteredAppRows]);

  const filteredAssistData = useMemo(() => {
    if (!isFiltered || !assistanceData) return assistanceData;
    const rows = (assistanceData.rows ?? []).filter((r) => r.barangay === effectiveBarangay);
    const totalReleased = rows.filter((r) => r.status === 'released').reduce((s, r) => s + r.amount, 0);
    const now = new Date();
    const releasedThisMonth = rows
      .filter((r) => {
        if (r.status !== 'released') return false;
        const parts = r.releasedAt.split('/');
        if (parts.length < 3) return false;
        const d = new Date(parts[2], parts[0] - 1, parts[1]);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, r) => s + r.amount, 0);
    return { rows, totalReleased, releasedThisMonth };
  }, [assistanceData, isFiltered, effectiveBarangay]);

  const filteredReleaseRows = useMemo(() => {
    let rows = isFiltered ? releaseRows.filter((r) => r.barangay === effectiveBarangay) : releaseRows;
    if (releaseSearch) {
      const q = releaseSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.reference?.toLowerCase().includes(q) ||
        r.applicant?.toLowerCase().includes(q) ||
        r.barangay?.toLowerCase().includes(q) ||
        r.program?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [releaseRows, isFiltered, effectiveBarangay, releaseSearch]);

  const releaseTotalAmount = useMemo(
    () => filteredReleaseRows.reduce((sum, r) => sum + (r.approvedAmount ?? 0), 0),
    [filteredReleaseRows]
  );

  // Build a highlights/households view scoped to the selected barangay for admin
  const filteredHouseholds = useMemo(() => {
    if (!isFiltered || !households) return households;
    const rows = filteredHhRows;
    const total = rows.length || 1;
    const tierCounts = { no_income: 0, low_income: 0, moderate: 0, above_moderate: 0 };
    for (const r of rows) tierCounts[r.tierKey] = (tierCounts[r.tierKey] ?? 0) + 1;
    return {
      summary: {
        totalHouseholds: rows.length,
        totalResidents: rows.reduce((s, r) => s + Number(r.members || 0), 0),
        tupadPriorityHouseholds: tierCounts.no_income + tierCounts.low_income,
        indigentHouseholds: tierCounts.no_income,
        lumonHouseholds: 0,
        householdsWithActiveCases: 0,
      },
      classificationBreakdown: [
        { key: 'no_income',      label: 'No Income / No Work', count: tierCounts.no_income,      percentage: Math.round((tierCounts.no_income      / total) * 100) },
        { key: 'low_income',     label: 'Low Income',           count: tierCounts.low_income,     percentage: Math.round((tierCounts.low_income     / total) * 100) },
        { key: 'moderate',       label: 'Moderate Income',      count: tierCounts.moderate,       percentage: Math.round((tierCounts.moderate       / total) * 100) },
        { key: 'above_moderate', label: 'Above Moderate',       count: tierCounts.above_moderate, percentage: Math.round((tierCounts.above_moderate / total) * 100) },
      ],
      lowIncomeByBarangay: households.lowIncomeByBarangay,
    };
  }, [households, isFiltered, filteredHhRows]);

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="page-load-spinner" role="status" aria-live="polite">Loading reports…</div>
      </div>
    );
  }

  const scopeLabel = isBarangayScoped
    ? (session?.barangayName || 'your assigned barangay')
    : (selectedBarangay === 'all' ? null : selectedBarangay);

  return (
    <div className="workspace-page">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="reports-tabs">
        <section className="panel settings-tabs-shell reports-tabs-shell">
          <div className="reports-header-row">
            <SectionHeading title="Report center" />
            {isAdmin && (
              <div className="reports-barangay-selector">
                <label htmlFor="reports-barangay-filter" className="reports-barangay-selector__label">
                  View barangay
                </label>
                <select
                  id="reports-barangay-filter"
                  className="reports-select reports-select--barangay"
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                >
                  <option value="all">All barangays</option>
                  {allBarangays.map((b) => (
                    <option key={b.id ?? b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <TabsList className="reports-tablist" aria-label="Report sections">
            {[
              { value: 'highlights',   label: 'Highlights' },
              { value: 'applications', label: 'Applications' },
              { value: 'households',   label: 'Households' },
              { value: 'assistance',   label: 'Assistance' },
              { value: 'workload',     label: 'Workload' },
              { value: 'release',      label: 'Release Report' },
            ].map((tab) => (
              <TabsTrigger key={tab.value} className="settings-tab reports-tab" value={tab.value}>
                <strong>{tab.label}</strong>
              </TabsTrigger>
            ))}
          </TabsList>
        </section>

        {pageError ? <div className="auth-alert">{pageError}</div> : null}

        {!scopeLabel && isAdmin ? (
          <div className="application-queue-note">
            <strong>Municipality view</strong>
            <p>Showing data across all barangays in Barbaza. Use the selector above to drill into a specific barangay.</p>
          </div>
        ) : null}

        <TabsContent value="highlights" className="mt-0">
          <HighlightsTab
            stats={stats}
            households={filteredHouseholds}
            isBarangayScoped={isFiltered}
            scopedBarangayName={effectiveBarangay}
          />
        </TabsContent>

        <TabsContent value="applications" className="mt-0">
          <ApplicationsTab
            rows={filteredAppRows}
            isBarangayScoped={isFiltered}
            scopedBarangayName={effectiveBarangay}
          />
        </TabsContent>

        <TabsContent value="households" className="mt-0">
          <HouseholdsTab
            rows={filteredHhRows}
            lowIncomeByBarangay={filteredHouseholds?.lowIncomeByBarangay}
            isBarangayScoped={isFiltered}
            scopedBarangayName={effectiveBarangay}
          />
        </TabsContent>

        <TabsContent value="assistance" className="mt-0">
          <AssistanceTab
            data={filteredAssistData}
            isBarangayScoped={isFiltered}
            scopedBarangayName={effectiveBarangay}
          />
        </TabsContent>

        <TabsContent value="workload" className="mt-0">
          <WorkloadTab
            workload={filteredWorkload}
            byProgram={filteredByProgram}
            isBarangayScoped={isFiltered}
            scopedBarangayName={effectiveBarangay}
          />
        </TabsContent>

        <TabsContent value="release" className="mt-0">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'flex-end' }}>
            <label className="settings-field" style={{ minWidth: '160px' }}>
              <span>From date</span>
              <input
                type="date"
                className="reports-search-input"
                value={releaseFromDate}
                onChange={(e) => setReleaseFromDate(e.target.value)}
              />
            </label>
            <label className="settings-field" style={{ minWidth: '160px' }}>
              <span>To date</span>
              <input
                type="date"
                className="reports-search-input"
                value={releaseToDate}
                onChange={(e) => setReleaseToDate(e.target.value)}
              />
            </label>
            <label className="settings-field" style={{ flex: 1, minWidth: '200px' }}>
              <span>Search</span>
              <input
                type="text"
                className="reports-search-input"
                placeholder="Reference, applicant, barangay, program…"
                value={releaseSearch}
                onChange={(e) => setReleaseSearch(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div className="records-modal__card" style={{ flex: 1 }}>
              <span>Total beneficiaries</span>
              <strong>{filteredReleaseRows.length}</strong>
            </div>
            <div className="records-modal__card" style={{ flex: 1 }}>
              <span>Total amount released</span>
              <strong>
                {releaseTotalAmount > 0
                  ? `₱${releaseTotalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                  : '₱0.00'}
              </strong>
            </div>
          </div>

          <ExportBar
            label={`${filteredReleaseRows.length} record(s)`}
            disabled={filteredReleaseRows.length === 0}
            onCsv={() => exportToCsv('release-report', RELEASE_EXPORT_COLS, filteredReleaseRows)}
            onPdf={() => exportToPdf(
              'release-report',
              'Release of Assistance Report',
              RELEASE_EXPORT_COLS,
              filteredReleaseRows,
              `Municipality of Barbaza, Antique — MSWD Office — Generated ${new Date().toLocaleDateString('en-PH')}`
            )}
          />

          {loadingRelease ? (
            <p style={{ color: '#6b7280', padding: '1rem 0', fontSize: '0.9rem' }}>Loading release report…</p>
          ) : (
            <ReportTable
              columns={RELEASE_COLUMNS}
              rows={filteredReleaseRows}
              emptyMessage="No released applications found for the selected filters."
            />
          )}

          <div className="release-signature-block">
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              I/We hereby acknowledge receipt of the above-stated assistance from the Municipal Social Welfare and Development Office (MSWDO) of Barbaza, Antique.
            </p>
            <div className="release-signature-block__grid">
              <div>
                <div className="release-signature-block__line" />
                <span>Beneficiary Signature over Printed Name</span>
              </div>
              <div>
                <div className="release-signature-block__line" />
                <span>MSWD Officer / Releasing Officer</span>
              </div>
              <div>
                <div className="release-signature-block__line" />
                <span>Date</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
