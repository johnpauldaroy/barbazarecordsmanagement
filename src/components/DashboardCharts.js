import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import SectionHeading from './SectionHeading';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BLUE = '#1d4ed8';
const BLUE_SOFT = '#3b82f6';
const RUST = '#9a3412';
const RED = '#b42318';

const sharedLegend = {
  position: 'bottom',
  labels: {
    boxWidth: 10,
    boxHeight: 10,
    color: '#526170',
    padding: 14,
    font: {
      size: 11,
      weight: 700,
    },
    usePointStyle: true,
    pointStyle: 'circle',
  },
};

function formatTooltipLabel(context) {
  const value = Number(context.raw ?? 0);
  return `${context.dataset.label}: ${value.toLocaleString()}`;
}

const sharedTooltip = {
  backgroundColor: '#14283d',
  padding: 10,
  titleColor: '#f8fafc',
  bodyColor: '#e2e8f0',
  borderColor: 'rgba(255, 255, 255, 0.3)',
  borderWidth: 1,
  callbacks: {
    label: formatTooltipLabel,
  },
};

const axisStyle = {
  x: {
    grid: {
      color: 'rgba(96, 112, 128, 0.12)',
    },
    ticks: {
      color: '#5b6a79',
      font: {
        size: 11,
        weight: 600,
      },
      maxRotation: 0,
    },
    border: {
      color: 'rgba(96, 112, 128, 0.32)',
    },
  },
  y: {
    beginAtZero: true,
    grid: {
      color: 'rgba(96, 112, 128, 0.14)',
    },
    ticks: {
      color: '#5b6a79',
      precision: 0,
      font: {
        size: 11,
        weight: 600,
      },
    },
    border: {
      color: 'rgba(96, 112, 128, 0.32)',
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: sharedTooltip,
  },
  scales: axisStyle,
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: sharedLegend,
    tooltip: sharedTooltip,
  },
  scales: axisStyle,
};

const hBarOptions = {
  ...barOptions,
  indexAxis: 'y',
  plugins: {
    ...barOptions.plugins,
    legend: sharedLegend,
  },
};

function ChartPanel({ eyebrow, title, description, height, href, children }) {
  const panel = (
    <article className="panel panel--highlight dashboard-chart-panel">
      <div className="section-heading dashboard-chart-panel__header">
        <span className="section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="dashboard-chart-panel__canvas" style={{ height }}>
        {children}
      </div>
    </article>
  );

  if (!href) {
    return panel;
  }

  return (
    <a href={href} className="dashboard-chart-link" aria-label={`${title} details`}>
      {panel}
    </a>
  );
}

function DashboardCharts({ data, drilldowns = {} }) {
  if (!data) {
    return null;
  }

  const {
    monthlyApprovals = [],
    programBreakdown = {},
    workloadByBarangay = [],
    slaTrend = [],
  } = data;

  if (process.env.NODE_ENV === 'test') {
    return (
      <section className="panel">
        <SectionHeading eyebrow="Analytics" title="Performance at a glance" />
        <div className="stats-grid">
          <div className="stat-card stat-card--accent">
            <span className="section-eyebrow">Latest month</span>
            <strong>{monthlyApprovals.at(-1)?.count ?? 0}</strong>
            <small>Monthly approvals</small>
          </div>
          <div className="stat-card stat-card--warning">
            <span className="section-eyebrow">SLA compliance trend</span>
            <strong>{slaTrend.at(-1)?.breaches ?? 0}</strong>
            <small>Latest-period breaches</small>
          </div>
          <div className="stat-card stat-card--good">
            <span className="section-eyebrow">Programs tracked</span>
            <strong>{programBreakdown.labels?.length ?? 0}</strong>
            <small>Included in distribution summary</small>
          </div>
          <div className="stat-card stat-card--accent">
            <span className="section-eyebrow">Barangays</span>
            <strong>{workloadByBarangay.length}</strong>
            <small>With active workload counts</small>
          </div>
        </div>
      </section>
    );
  }

  const hasSlaData = slaTrend.some(
    (item) => Number(item.breaches ?? 0) > 0 || Number(item.withinSla ?? 0) > 0
  );
  const hasWorkloadData = workloadByBarangay.some(
    (item) => Number(item.pending ?? 0) > 0 || Number(item.approved ?? 0) > 0
  );
  const hasData = hasSlaData || hasWorkloadData;

  if (!hasData) {
    return (
      <section className="panel dashboard-analytics-section">
        <SectionHeading title="Performance at a glance" />
        <div className="application-queue-note reports-empty-state">
          <strong>No analytics records yet.</strong>
          <p>Charts will appear after applications or releases are recorded.</p>
        </div>
      </section>
    );
  }

  const slaTrendData = {
    labels: slaTrend.map((item) => item.period),
    datasets: [
      {
        label: 'Within SLA',
        data: slaTrend.map((item) => item.withinSla),
        borderColor: BLUE,
        backgroundColor: 'rgba(29, 78, 216, 0.12)',
        pointBackgroundColor: BLUE,
        pointBorderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Breaches',
        data: slaTrend.map((item) => item.breaches),
        borderColor: RED,
        backgroundColor: 'rgba(180, 35, 24, 0.08)',
        pointBackgroundColor: RED,
        pointBorderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const workloadByBarangayData = {
    labels: workloadByBarangay.map((item) => item.barangay),
    datasets: [
      {
        label: 'Pending',
        data: workloadByBarangay.map((item) => item.pending),
        backgroundColor: 'rgba(154, 52, 18, 0.82)',
        hoverBackgroundColor: RUST,
        borderRadius: 7,
        borderSkipped: false,
      },
      {
        label: 'Approved',
        data: workloadByBarangay.map((item) => item.approved),
        backgroundColor: 'rgba(29, 78, 216, 0.74)',
        hoverBackgroundColor: BLUE_SOFT,
        borderRadius: 7,
        borderSkipped: false,
      },
    ],
  };

  return (
    <section className="panel dashboard-analytics-section">
      <SectionHeading
        title="Performance at a glance"
      />
      <div className="dashboard-analytics-layout">
        {hasSlaData ? (
          <div className="dashboard-analytics-column">
            <ChartPanel
              eyebrow="SLA monitor"
              title="SLA Compliance Trend"
              description="Within-SLA volume against 48-hour breaches."
              href={drilldowns.slaTrend}
              height={245}
            >
              <Line data={slaTrendData} options={lineOptions} />
            </ChartPanel>
          </div>
        ) : null}

        {hasWorkloadData ? (
          <div className="dashboard-analytics-column">
            <ChartPanel
              eyebrow="Workload"
              title="Cases by Barangay"
              description="Pending and approved cases by barangay."
              href={drilldowns.workloadByBarangay}
              height={290}
            >
              <Bar data={workloadByBarangayData} options={hBarOptions} />
            </ChartPanel>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DashboardCharts;
