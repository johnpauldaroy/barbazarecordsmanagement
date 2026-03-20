import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { monthlyApprovals, programBreakdown, workloadByBarangay } from '../systemData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const NAVY = '#17324b';
const NAVY_LIGHT = '#29445e';
const GOLD = '#d8b270';
const GOLD_LIGHT = '#ebc888';
const TEAL = '#2e7d6a';
const CORAL = '#c0533b';
const SLATE = '#edf2f6';

const defaultFont = {
  family: "'Segoe UI Variable Display', 'Segoe UI', Bahnschrift, sans-serif",
  size: 12,
  weight: '700',
};

const sharedTooltip = {
  backgroundColor: NAVY,
  titleColor: '#f4f7fb',
  bodyColor: '#c9d8e6',
  borderColor: 'rgba(255,255,255,0.14)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 12,
  titleFont: { ...defaultFont, size: 13 },
  bodyFont: { ...defaultFont, weight: '600' },
};

// ── Monthly Approvals (Vertical Bar) ────────────────────────────────────────

const barData = {
  labels: monthlyApprovals.map((d) => d.month),
  datasets: [
    {
      label: 'Approvals',
      data: monthlyApprovals.map((d) => d.count),
      backgroundColor: monthlyApprovals.map((_, i) =>
        i === monthlyApprovals.length - 1
          ? GOLD
          : `rgba(23, 50, 75, 0.72)`
      ),
      hoverBackgroundColor: monthlyApprovals.map((_, i) =>
        i === monthlyApprovals.length - 1 ? GOLD_LIGHT : NAVY_LIGHT
      ),
      borderRadius: 10,
      borderSkipped: false,
    },
  ],
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => ` ${ctx.parsed.y} approvals` } },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#5c6b79', font: defaultFont },
    },
    y: {
      grid: { color: SLATE, drawBorder: false },
      border: { display: false, dash: [4, 4] },
      ticks: { color: '#5c6b79', font: defaultFont, maxTicksLimit: 5 },
    },
  },
};

// ── Program Breakdown (Doughnut) ─────────────────────────────────────────────

const doughnutData = {
  labels: programBreakdown.labels,
  datasets: [
    {
      data: programBreakdown.values,
      backgroundColor: [NAVY, GOLD, TEAL, '#8da1b4'],
      hoverBackgroundColor: [NAVY_LIGHT, GOLD_LIGHT, '#3a9e86', '#a1b4c5'],
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 8,
    },
  ],
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#394a5c',
        font: defaultFont,
        padding: 16,
        pointStyle: 'circle',
        usePointStyle: true,
      },
    },
    tooltip: {
      ...sharedTooltip,
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
      },
    },
  },
};

// ── Cases by Barangay (Horizontal Bar) ───────────────────────────────────────

const hBarData = {
  labels: workloadByBarangay.map((d) => d.barangay),
  datasets: [
    {
      label: 'Pending',
      data: workloadByBarangay.map((d) => d.pending),
      backgroundColor: `rgba(192, 83, 59, 0.82)`,
      hoverBackgroundColor: CORAL,
      borderRadius: 8,
      borderSkipped: false,
    },
    {
      label: 'Approved',
      data: workloadByBarangay.map((d) => d.approved),
      backgroundColor: `rgba(23, 50, 75, 0.78)`,
      hoverBackgroundColor: NAVY_LIGHT,
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
};

const hBarOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#394a5c',
        font: defaultFont,
        padding: 16,
        pointStyle: 'circle',
        usePointStyle: true,
      },
    },
    tooltip: {
      ...sharedTooltip,
      callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x} cases` },
    },
  },
  scales: {
    x: {
      grid: { color: SLATE },
      border: { display: false, dash: [4, 4] },
      ticks: { color: '#5c6b79', font: defaultFont, maxTicksLimit: 5 },
      stacked: false,
    },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#394a5c', font: defaultFont },
    },
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

function ChartPanel({ title, eyebrow, children, height = 260 }) {
  return (
    <article className="chart-panel">
      <div className="chart-panel__header">
        <span className="section-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      <div className="chart-panel__canvas" style={{ height }}>
        {children}
      </div>
    </article>
  );
}

function DashboardCharts() {
  return (
    <section className="panel">
      <div className="section-heading">
        <span className="section-eyebrow">Analytics</span>
        <h2>Performance at a glance</h2>
      </div>
      <div className="charts-grid">
        <ChartPanel eyebrow="6-month trend" title="Monthly Approvals" height={240}>
          <Bar data={barData} options={barOptions} />
        </ChartPanel>

        <ChartPanel eyebrow="Distribution" title="Program Breakdown" height={280}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </ChartPanel>

        <ChartPanel eyebrow="Workload" title="Cases by Barangay" height={240}>
          <Bar data={hBarData} options={hBarOptions} />
        </ChartPanel>
      </div>
    </section>
  );
}

export default DashboardCharts;
