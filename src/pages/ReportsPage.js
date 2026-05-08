import { useEffect, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { resolveSessionRoleKey } from '../roleAccess';
import { supabaseService } from '../supabaseService';

function ReportsPage({ session }) {
  const [stats, setStats] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [activeTab, setActiveTab] = useState('highlights');
  const roleKey = resolveSessionRoleKey(session);
  const isBarangayScopedRole = roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
  const scopedBarangayName = session?.barangayName || '';

  useEffect(() => {
    let isMounted = true;

    async function initReports() {
      supabaseService.setSessionContext(session);
      setLoading(true);
      setPageError('');

      try {
        const [summary, chartData] = await Promise.all([
          supabaseService.getReportsSummary(),
          supabaseService.getChartData(),
        ]);

        if (!isMounted) {
          return;
        }

        setStats(summary);
        setWorkload(chartData.workloadByBarangay);
      } catch (error) {
        if (isMounted) {
          setPageError(error.message || 'Failed to load reports.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void initReports();

    return () => {
      isMounted = false;
    };
  }, [session]);

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="page-load-spinner" role="status" aria-live="polite">
          Loading reports…
        </div>
      </div>
    );
  }

  const maxPending = Math.max(...workload.map((item) => item.pending), 1);

  return (
    <div className="workspace-page">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="reports-tabs">
        <section className="panel settings-tabs-shell reports-tabs-shell">
          <SectionHeading
            title="Report center"
          />
          <TabsList className="reports-tablist" aria-label="Report sections">
            <TabsTrigger id="reports-tab-highlights" className="settings-tab reports-tab" value="highlights">
              <strong>Highlights</strong>
            </TabsTrigger>
            <TabsTrigger id="reports-tab-workload" className="settings-tab reports-tab" value="workload">
              <strong>Workload</strong>
            </TabsTrigger>
          </TabsList>
        </section>

        {pageError ? <div className="auth-alert">{pageError}</div> : null}
        {isBarangayScopedRole ? (
          <div className="application-queue-note">
            <strong>Barangay view</strong>
            <p>Report outputs are scoped to {scopedBarangayName || 'your assigned barangay'}.</p>
          </div>
        ) : null}

        <TabsContent value="highlights" className="mt-0">
          <section
            className="panel reports-tabpanel"
            id="reports-panel-highlights"
            role="tabpanel"
            aria-labelledby="reports-tab-highlights"
          >
            <SectionHeading eyebrow="Summary" title="Reporting highlights" />
            <div className="stats-grid">
              {stats.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="workload" className="mt-0">
          <section
            className="panel reports-tabpanel"
            id="reports-panel-workload"
            role="tabpanel"
            aria-labelledby="reports-tab-workload"
          >
            <SectionHeading
              eyebrow="Workload"
              title="Pending by barangay"
              description={
                isBarangayScopedRole
                  ? `Queue pressure and current-month approvals for ${scopedBarangayName || 'your assigned barangay'}.`
                  : 'Queue pressure and current-month approvals across all barangays.'
              }
            />
            {workload.length ? (
              <div className="bar-list">
                {workload.map((item) => (
                  <div key={item.barangay} className="bar-row">
                    <div className="bar-row__labels">
                      <strong>{item.barangay}</strong>
                      <div className="bar-row__actions">
                        <span>{item.pending} pending</span>
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
            ) : (
              <div className="application-queue-note reports-empty-state">
                <strong>No barangay workload records found.</strong>
                <p>New pending and approved case counts will appear here automatically.</p>
              </div>
            )}
          </section>
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default ReportsPage;
